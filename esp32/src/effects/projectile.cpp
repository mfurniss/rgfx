#include "projectile.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "graphics/canvas.h"
#include "network/mqtt.h"
#include <cmath>
#include <cstring>

namespace {
	constexpr float PROJECTILE_MIN_SEGMENT_WIDTH = 4.0f;
	constexpr uint8_t PROJECTILE_TRAIL_ALPHA_MIN = 25;
	constexpr uint8_t PROJECTILE_TRAIL_ALPHA_MAX = 120;
}  // namespace

static ProjectileDirection parseDirection(const char* dir, bool is1D) {
	ProjectileDirection result;

	if (strcmp(dir, "random") == 0 || strcmp(dir, "") == 0) {
		result = static_cast<ProjectileDirection>(hal::random(4));
	} else if (strcmp(dir, "left") == 0) {
		result = ProjectileDirection::LEFT;
	} else if (strcmp(dir, "right") == 0) {
		result = ProjectileDirection::RIGHT;
	} else if (strcmp(dir, "up") == 0) {
		result = ProjectileDirection::UP;
	} else if (strcmp(dir, "down") == 0) {
		result = ProjectileDirection::DOWN;
	} else {
		result = static_cast<ProjectileDirection>(hal::random(4));
	}

	// For 1D strips, vertical directions map to horizontal
	if (is1D) {
		if (result == ProjectileDirection::UP)
			result = ProjectileDirection::LEFT;
		if (result == ProjectileDirection::DOWN)
			result = ProjectileDirection::RIGHT;
	}

	return result;
}

ProjectileEffect::ProjectileEffect(const Matrix& m, Canvas& c)
    : canvas(c), canvasWidth(c.getWidth()), canvasHeight(c.getHeight()) {
	(void)m;  // Matrix not needed, but kept for API consistency
	projectiles.reserve(16);  // Pre-allocate to avoid heap fragmentation
}

void ProjectileEffect::add(JsonDocument& props) {
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: projectile missing or invalid 'color' prop");
		publishError("projectile", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	uint32_t velocity = props["velocity"];
	float friction = props["friction"];
	float trail = props["trail"];
	uint8_t width = props["width"];
	uint8_t height = props["height"];
	uint32_t lifespanMs = props["lifespan"];
	const char* dirStr = props["direction"] | "";

	bool is1D = canvas.getHeight() == 1;
	ProjectileDirection direction = parseDirection(dirStr, is1D);

	// For 1D strips, use larger of width/height as width, force height to 1
	if (is1D) {
		width = (width > height) ? width : height;
		height = 1;
	}

	Projectile newProjectile;
	newProjectile.r = (color >> 16) & 0xFF;
	newProjectile.g = (color >> 8) & 0xFF;
	newProjectile.b = color & 0xFF;
	newProjectile.width = width;
	newProjectile.height = height;
	newProjectile.friction = friction;
	newProjectile.trail = trail;
	newProjectile.elapsedTime = 0.0f;
	newProjectile.maxLifespan = lifespanMs / 1000.0f;

	// Calculate start position and velocity based on direction
	switch (direction) {
		case ProjectileDirection::RIGHT:
			newProjectile.x = -static_cast<float>(width);
			newProjectile.y = (canvasHeight - height) / 2.0f;
			newProjectile.velocityX = static_cast<float>(velocity);
			newProjectile.velocityY = 0.0f;
			break;
		case ProjectileDirection::LEFT:
			newProjectile.x = static_cast<float>(canvasWidth);
			newProjectile.y = (canvasHeight - height) / 2.0f;
			newProjectile.velocityX = -static_cast<float>(velocity);
			newProjectile.velocityY = 0.0f;
			break;
		case ProjectileDirection::DOWN:
			newProjectile.x = (canvasWidth - width) / 2.0f;
			newProjectile.y = -static_cast<float>(height);
			newProjectile.velocityX = 0.0f;
			newProjectile.velocityY = static_cast<float>(velocity);
			break;
		case ProjectileDirection::UP:
			newProjectile.x = (canvasWidth - width) / 2.0f;
			newProjectile.y = static_cast<float>(canvasHeight);
			newProjectile.velocityX = 0.0f;
			newProjectile.velocityY = -static_cast<float>(velocity);
			break;
	}

	projectiles.push_back(newProjectile);
}

void ProjectileEffect::update(float deltaTime) {
	if (projectiles.empty()) return;

	// Use index-based loop with swap-and-pop for O(1) removal
	for (size_t i = 0; i < projectiles.size();) {
		Projectile& p = projectiles[i];

		// Update elapsed time
		p.elapsedTime += deltaTime;

		// Apply friction to velocity (exponential decay model)
		// friction=0: no slowdown, friction=1: moderate, friction=2: fast
		// Formula: velocity *= (1 - friction * deltaTime), clamped to prevent reversal
		if (p.friction != 0.0f) {
			float decay = 1.0f - (p.friction * deltaTime);
			if (decay < 0.0f)
				decay = 0.0f;
			p.velocityX *= decay;
			p.velocityY *= decay;
		}

		// Update position
		p.x += p.velocityX * deltaTime;
		p.y += p.velocityY * deltaTime;

		// Check if projectile should be removed
		// Calculate actual trail length in pixels (velocity * trail multiplier)
		float trailPixels = fabsf(p.velocityX * p.trail) + fabsf(p.velocityY * p.trail);

		// Projectile is off-canvas when both head AND trail are fully outside
		bool offCanvas = (p.x < -static_cast<float>(p.width) - trailPixels) ||
		                 (p.x > static_cast<float>(canvasWidth) + trailPixels) ||
		                 (p.y < -static_cast<float>(p.height) - trailPixels) ||
		                 (p.y > static_cast<float>(canvasHeight) + trailPixels);
		bool expired = p.elapsedTime >= p.maxLifespan;

		if (offCanvas || expired) {
			// Swap-and-pop: O(1) removal instead of O(n) erase
			projectiles[i] = projectiles.back();
			projectiles.pop_back();
			// Don't increment i - need to check the swapped element
		} else {
			++i;
		}
	}
}

void ProjectileEffect::render() {
	if (projectiles.empty()) return;

	for (const auto& proj : projectiles) {
		// Render trail: tail position = current position - (velocity * trail multiplier)
		// trail=1.0 means trail length equals velocity, trail=0.2 means 20% of velocity
		if (proj.trail > 0.0f) {
			// Pre-calculate trail length directly (avoids redundant fabsf)
			float trailLength = fabsf(proj.velocityX * proj.trail);

			if (trailLength > 0.0f) {
				float tailX = proj.x - proj.velocityX * proj.trail;

				// Draw segments from tail to head with increasing alpha
				int numSegments = static_cast<int>(trailLength / PROJECTILE_MIN_SEGMENT_WIDTH);
				if (numSegments < 1)
					numSegments = 1;
				float segmentWidth = trailLength / numSegments;

				// Step direction and pre-calculate segment delta for additive loop
				float segDelta = (proj.x > tailX) ? segmentWidth : -segmentWidth;
				float segX = tailX;

				// Pre-calculate alpha increment to avoid division in loop
				int alphaRange = PROJECTILE_TRAIL_ALPHA_MAX - PROJECTILE_TRAIL_ALPHA_MIN;
				int alphaDivisor = (numSegments > 1) ? (numSegments - 1) : 1;

				for (int i = 0; i < numSegments; i++) {
					uint8_t alpha = (numSegments == 1)
					                    ? PROJECTILE_TRAIL_ALPHA_MAX
					                    : static_cast<uint8_t>(PROJECTILE_TRAIL_ALPHA_MIN +
					                                           (i * alphaRange / alphaDivisor));
					canvas.drawRectangle(
					    static_cast<int16_t>(segX), static_cast<int16_t>(proj.y),
					    static_cast<uint8_t>(segmentWidth + 1),  // +1 to avoid gaps
					    proj.height, CRGBA(proj.r, proj.g, proj.b, alpha), BlendMode::ADDITIVE);
					segX += segDelta;  // Additive increment instead of multiplication
				}
			}
		}

		// Render main projectile (full brightness, on top)
		canvas.drawRectangle(static_cast<int16_t>(proj.x), static_cast<int16_t>(proj.y), proj.width,
		                     proj.height, CRGBA(proj.r, proj.g, proj.b, 255), BlendMode::ADDITIVE);
	}
}

void ProjectileEffect::reset() {
	projectiles.clear();
}
