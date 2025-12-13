#include "projectile.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "graphics/canvas.h"
#include <cmath>
#include <cstring>

namespace {
	constexpr uint32_t PROJECTILE_DEFAULT_VELOCITY = 100;
	constexpr uint32_t PROJECTILE_DEFAULT_WIDTH = 16;
	constexpr uint32_t PROJECTILE_DEFAULT_HEIGHT = 16;
	constexpr uint32_t PROJECTILE_DEFAULT_LIFESPAN_MS = 5000;
	constexpr float PROJECTILE_DEFAULT_FRICTION = 0.0f;
	constexpr float PROJECTILE_DEFAULT_TRAIL = 0.0f;
	constexpr float PROJECTILE_MIN_SEGMENT_WIDTH = 4.0f;
	constexpr uint8_t PROJECTILE_TRAIL_ALPHA_MIN = 25;
	constexpr uint8_t PROJECTILE_TRAIL_ALPHA_MAX = 120;
}  // namespace

static ProjectileDirection parseDirection(const char* dir, bool is1D) {
	ProjectileDirection result;

	if (dir == nullptr || strcmp(dir, "random") == 0) {
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

ProjectileEffect::ProjectileEffect(const Matrix& m, Canvas& c) : canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

void ProjectileEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : randomColor();
	uint32_t velocity = props["velocity"] | PROJECTILE_DEFAULT_VELOCITY;
	float friction =
		props["friction"].isNull() ? PROJECTILE_DEFAULT_FRICTION : props["friction"].as<float>();
	float trail = props["trail"].isNull() ? PROJECTILE_DEFAULT_TRAIL : props["trail"].as<float>();
	uint8_t width = props["width"] | PROJECTILE_DEFAULT_WIDTH;
	uint8_t height = props["height"] | PROJECTILE_DEFAULT_HEIGHT;
	uint32_t lifespanMs = props["lifespan"] | PROJECTILE_DEFAULT_LIFESPAN_MS;
	const char* dirStr = props["direction"] | "random";

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

	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

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
	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	for (auto it = projectiles.begin(); it != projectiles.end();) {
		// Update elapsed time
		it->elapsedTime += deltaTime;

		// Apply friction to velocity (exponential decay model)
		// friction=0: no slowdown, friction=1: moderate, friction=2: fast
		// Formula: velocity *= (1 - friction * deltaTime), clamped to prevent reversal
		if (it->friction != 0.0f) {
			float decay = 1.0f - (it->friction * deltaTime);
			if (decay < 0.0f)
				decay = 0.0f;
			it->velocityX *= decay;
			it->velocityY *= decay;
		}

		// Update position
		it->x += it->velocityX * deltaTime;
		it->y += it->velocityY * deltaTime;

		// Check if projectile should be removed
		// Calculate actual trail length in pixels (velocity * trail multiplier)
		float trailPixels = fabsf(it->velocityX * it->trail) + fabsf(it->velocityY * it->trail);

		// Projectile is off-canvas when both head AND trail are fully outside
		bool offCanvas = (it->x < -static_cast<float>(it->width) - trailPixels) ||
		                 (it->x > static_cast<float>(canvasWidth) + trailPixels) ||
		                 (it->y < -static_cast<float>(it->height) - trailPixels) ||
		                 (it->y > static_cast<float>(canvasHeight) + trailPixels);
		bool expired = it->elapsedTime >= it->maxLifespan;

		if (offCanvas || expired) {
			it = projectiles.erase(it);
		} else {
			++it;
		}
	}
}

void ProjectileEffect::render() {
	for (const auto& proj : projectiles) {
		// Render trail: tail position = current position - (velocity * trail multiplier)
		// trail=1.0 means trail length equals velocity, trail=0.2 means 20% of velocity
		if (proj.trail > 0.0f) {
			float tailX = proj.x - proj.velocityX * proj.trail;
			float trailLength = fabsf(proj.x - tailX);

			// Draw segments from tail to head with increasing alpha
			int numSegments = static_cast<int>(trailLength / PROJECTILE_MIN_SEGMENT_WIDTH);
			if (numSegments < 1)
				numSegments = 1;
			float segmentWidth = trailLength / numSegments;

			// Step direction: from tail toward head
			float stepDir = (proj.x > tailX) ? 1.0f : -1.0f;

			if (trailLength > 0) {
				for (int i = 0; i < numSegments; i++) {
					float segX = tailX + i * segmentWidth * stepDir;
					uint8_t alpha =
						(numSegments == 1)
							? PROJECTILE_TRAIL_ALPHA_MAX
							: static_cast<uint8_t>(
								  PROJECTILE_TRAIL_ALPHA_MIN +
								  (i * (PROJECTILE_TRAIL_ALPHA_MAX - PROJECTILE_TRAIL_ALPHA_MIN) /
					               (numSegments - 1)));
					canvas.drawRectangle(
						static_cast<int16_t>(segX), static_cast<int16_t>(proj.y),
						static_cast<uint8_t>(segmentWidth + 1),  // +1 to avoid gaps
						proj.height, CRGBA(proj.r, proj.g, proj.b, alpha), BlendMode::ADDITIVE);
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
