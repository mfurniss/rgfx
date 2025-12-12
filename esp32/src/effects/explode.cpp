#include "explode.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "hal/types.h"
#include "graphics/canvas.h"
#include "utils/easing.h"
#include <algorithm>
#include <cmath>

// Default color is generated randomly per explosion (see add() method)
static const uint32_t DEFAULT_PARTICLE_COUNT = 100;
static const float DEFAULT_POWER = 50.0f;
static const uint32_t DEFAULT_LIFESPAN = 800;
static const float DEFAULT_POWER_SPREAD = 1.6f;
static const uint32_t DEFAULT_PARTICLE_SIZE = 6;
static const uint32_t DEFAULT_HUE_SPREAD = 90;
static const float DEFAULT_FRICTION = 2.0f;
static const float DEFAULT_LIFESPAN_SPREAD = 1.3f;
static const uint32_t MAX_PARTICLE_POOL_SIZE = 500;

ExplodeEffect::ExplodeEffect(const Matrix& m, Canvas& c) : canvas(c), matrix(m), nextExplosionId(0) {
	particlePool.reserve(MAX_PARTICLE_POOL_SIZE);
}

void ExplodeEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : randomColor();
	uint32_t particleCount = props["particleCount"] | DEFAULT_PARTICLE_COUNT;
	particleCount = min(particleCount, MAX_PARTICLE_POOL_SIZE);
	float power = props["power"] | DEFAULT_POWER;
	uint32_t lifespan = props["lifespan"] | DEFAULT_LIFESPAN;
	float powerSpread = props["powerSpread"] | DEFAULT_POWER_SPREAD;
	uint32_t particleSize = props["particleSize"] | DEFAULT_PARTICLE_SIZE;
	uint32_t hueSpread = min(static_cast<uint32_t>(props["hueSpread"] | DEFAULT_HUE_SPREAD), 359u);
	float friction = props["friction"] | DEFAULT_FRICTION;
	float lifespanSpread = props["lifespanSpread"] | DEFAULT_LIFESPAN_SPREAD;

	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Scale power relative to largest matrix dimension (canvas is 4x matrix size)
	uint16_t largestDimension = max(matrix.width, matrix.height);
	float powerScale = static_cast<float>(largestDimension * 4) / 64.0f;
	float scaledPower = power * powerScale;

	// Parse center position as percentage (0-100), "random", or default to center (50%)
	float centerXPercent = 50.0f;
	if (props["centerX"].is<const char*>() && strcmp(props["centerX"].as<const char*>(), "random") == 0) {
		centerXPercent = hal::random(0, 101);
	} else if (props["centerX"].is<float>() || props["centerX"].is<int>()) {
		centerXPercent = props["centerX"].as<float>();
	}
	float centerX = (centerXPercent / 100.0f) * canvas.getWidth();

	float centerY;
	if (isStrip) {
		centerY = canvas.getHeight() / 2.0f;
	} else {
		float centerYPercent = 50.0f;
		if (props["centerY"].is<const char*>() && strcmp(props["centerY"].as<const char*>(), "random") == 0) {
			centerYPercent = hal::random(0, 101);
		} else if (props["centerY"].is<float>() || props["centerY"].is<int>()) {
			centerYPercent = props["centerY"].as<float>();
		}
		centerY = (centerYPercent / 100.0f) * canvas.getHeight();
	}

	// Extract RGB components
	uint8_t baseR = (color >> 16) & 0xFF;
	uint8_t baseG = (color >> 8) & 0xFF;
	uint8_t baseB = color & 0xFF;

	// Create new explosion with unique ID
	Explosion newExplosion;
	newExplosion.id = nextExplosionId++;
	newExplosion.centerX = centerX;
	newExplosion.centerY = centerY;
	newExplosion.particleSize = particleSize;
	newExplosion.friction = friction;

	// Initialize flash for LED strips (white pulse that collapses inward)
	if (isStrip) {
		// Flash width proportional to power, capped at 30% of canvas width
		newExplosion.flashInitialWidth =
			min(scaledPower * 0.5f, static_cast<float>(canvas.getWidth()) * 0.3f);
		newExplosion.flashDuration = (lifespan * 0.35f) / 1000.0f;  // 35% of lifespan, in seconds
		newExplosion.flashAge = 0.0f;
	} else {
		newExplosion.flashInitialWidth = 0.0f;  // No flash for matrix
		newExplosion.flashDuration = 0.0f;
		newExplosion.flashAge = 0.0f;
	}

	// FIFO eviction: if adding particleCount would exceed max, remove oldest particles first
	if (particlePool.size() + particleCount > MAX_PARTICLE_POOL_SIZE) {
		uint32_t toRemove = (particlePool.size() + particleCount) - MAX_PARTICLE_POOL_SIZE;
		toRemove = min(toRemove, static_cast<uint32_t>(particlePool.size()));
		if (toRemove > 0) {
			particlePool.erase(particlePool.begin(), particlePool.begin() + toRemove);
		}
	}

	// Generate particles with randomized velocities and hues
	for (uint32_t i = 0; i < particleCount; i++) {
		Particle p;
		p.x = centerX;
		p.y = centerY;
		p.explosionId = newExplosion.id;

		// Calculate velocity with power variation based on powerSpread
		float powerVariation =
			scaledPower *
			(1.0f + (static_cast<float>(hal::random(-100, 100)) / 100.0f) * (powerSpread - 1.0f));

		if (isStrip) {
			// Strip: Only horizontal movement (half go left, half go right)
			float direction = (i < particleCount / 2) ? -1.0f : 1.0f;
			p.vx = direction * powerVariation;
			p.vy = 0.0f;
		} else {
			// Matrix: Full 2D explosion with radial distribution
			float angle = (static_cast<float>(i) / particleCount) * 2.0f * PI;
			angle += (static_cast<float>(hal::random(-100, 100)) / 100.0f) * 0.3f;
			p.vx = cos(angle) * powerVariation;
			p.vy = sin(angle) * powerVariation;
		}

		// Apply hue spread if non-zero
		if (hueSpread > 0) {
			// Convert to HSV for hue manipulation
			// Use raw array to avoid GRB layout confusion
			CRGB baseRgb;
			baseRgb.raw[0] = baseG;
			baseRgb.raw[1] = baseR;
			baseRgb.raw[2] = baseB;
			CHSV baseHsv = rgb2hsv_approximate(baseRgb);

			// Convert hueSpread from degrees (0-360) to 8-bit (0-255) for FastLED
			uint8_t hueSpread8bit = (hueSpread * 255) / 360;

			// Apply hue spread: shift base hue by -hueSpread/2, then add random offset
			uint8_t randomOffset = random8(hueSpread8bit + 1);
			uint8_t particleHue = baseHsv.hue - (hueSpread8bit / 2) + randomOffset;

			// Create HSV color with modified hue
			CHSV particleHsv(particleHue, baseHsv.sat, baseHsv.val);

			// Convert back to RGB
			CRGB particleRgb = particleHsv;
			// FastLED stores in GRB order internally, so read accordingly
			p.g = particleRgb.raw[0];
			p.r = particleRgb.raw[1];
			p.b = particleRgb.raw[2];
		} else {
			// No hue spread - use original RGB color directly
			p.r = baseR;
			p.g = baseG;
			p.b = baseB;
		}

		p.alpha = 255;
		p.age = 0;

		// Apply lifespan variation symmetrically around lifespan (±spread%)
		if (lifespanSpread < 1.01f) {
			p.lifespan = lifespan;
		} else {
			float spreadAmount = lifespan * (lifespanSpread - 1.0f);
			float variation = (static_cast<float>(hal::random(0, 200)) / 100.0f) - 1.0f;  // -1.0 to 1.0
			float calculatedLifespan = lifespan + variation * spreadAmount;
			p.lifespan = static_cast<uint32_t>(max(50.0f, calculatedLifespan));
		}
		p.lifespanMultiplier = 1.0f;

		particlePool.push_back(p);
	}

	explosions.push_back(newExplosion);
}

void ExplodeEffect::update(float deltaTime) {

	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Update flash age for all explosions (LED strips only)
	if (isStrip) {
		for (auto& exp : explosions) {
			if (exp.flashAge < exp.flashDuration) {
				exp.flashAge += deltaTime;
			}
		}
	}

	// Update all particles in the shared pool
	for (auto p = particlePool.begin(); p != particlePool.end();) {
		// Find the explosion this particle belongs to (for friction)
		float friction = DEFAULT_FRICTION;
		for (const auto& exp : explosions) {
			if (exp.id == p->explosionId) {
				friction = exp.friction;
				break;
			}
		}

		// Update X position (always)
		p->x += p->vx * deltaTime;
		p->vx *= (1.0f - (friction * deltaTime));

		// Update Y position (only for matrices)
		if (!isStrip) {
			p->y += p->vy * deltaTime;
			p->vy *= (1.0f - (friction * deltaTime));
		}

		// Age the particle
		p->age += deltaTimeMs;

		// Remove particles that are dead or out of bounds
		bool outOfBounds;
		if (isStrip) {
			outOfBounds = (p->x < 0 || p->x >= width);
		} else {
			outOfBounds = (p->x < 0 || p->x >= width || p->y < 0 || p->y >= height);
		}

		if (p->age >= p->lifespan || outOfBounds) {
			p = particlePool.erase(p);
		} else {
			float lifeProgress = static_cast<float>(p->age) / p->lifespan;
			p->alpha = static_cast<uint8_t>(255.0f * (1.0f - lifeProgress));
			++p;
		}
	}

	// Remove explosions that have no particles left
	for (auto expIt = explosions.begin(); expIt != explosions.end();) {
		bool hasParticles = false;
		for (const auto& particle : particlePool) {
			if (particle.explosionId == expIt->id) {
				hasParticles = true;
				break;
			}
		}

		if (!hasParticles) {
			expIt = explosions.erase(expIt);
		} else {
			++expIt;
		}
	}
}

void ExplodeEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Render flashes first for LED strips (white pulse that collapses inward)
	if (isStrip) {
		for (const auto& exp : explosions) {
			if (exp.flashAge >= exp.flashDuration || exp.flashInitialWidth <= 0.0f) {
				continue;
			}

			float progress = exp.flashAge / exp.flashDuration;
			float easedProgress = quarticEaseOutf(progress);
			float currentHalfWidth = (exp.flashInitialWidth * 0.5f) * (1.0f - easedProgress);
			if (currentHalfWidth < 1.0f) {
				continue;
			}
			float maxAlpha = 150.0f * (1.0f - easedProgress);
			float alphaPerPixel = maxAlpha / currentHalfWidth;

			// Draw from center outward (both directions)
			int16_t centerX = static_cast<int16_t>(exp.centerX);

			for (int16_t offset = 0; offset <= static_cast<int16_t>(currentHalfWidth); offset++) {
				uint8_t alpha = static_cast<uint8_t>(maxAlpha - offset * alphaPerPixel);
				int16_t leftX = centerX - offset;
				int16_t rightX = centerX + offset;

				if (leftX >= 0 && leftX < width) {
					canvas.drawPixel(leftX, 0, CRGBA(255, 255, 255, alpha), BlendMode::ADDITIVE);
				}

				if (offset > 0 && rightX >= 0 && rightX < width) {
					canvas.drawPixel(rightX, 0, CRGBA(255, 255, 255, alpha), BlendMode::ADDITIVE);
				}
			}
		}
	}

	// Render all particles from the shared pool
	for (const auto& particle : particlePool) {
		// Find the explosion this particle belongs to (for size)
		const Explosion* explosion = nullptr;
		for (const auto& exp : explosions) {
			if (exp.id == particle.explosionId) {
				explosion = &exp;
				break;
			}
		}

		if (!explosion) {
			continue;
		}

		uint32_t size = explosion->particleSize;
		int16_t halfSize = size / 2;

		// Convert float position to integer canvas coordinates (center of particle)
		int16_t centerX = static_cast<int16_t>(particle.x);
		int16_t centerY = static_cast<int16_t>(particle.y);

		if (isStrip) {
			// Strip: Render full-height column for particle
			for (uint32_t dx = 0; dx < size; dx++) {
				int16_t x = centerX - halfSize + dx;

				if (x >= 0 && x < width) {
					canvas.drawRectangle(x, 0, 1, height,
					                     CRGBA(particle.r, particle.g, particle.b, particle.alpha),
					                     BlendMode::ADDITIVE);
				}
			}
		} else {
			// Matrix: Render NxN block centered around position
			int16_t x = centerX - halfSize;
			int16_t y = centerY - halfSize;
			int16_t sizeS = static_cast<int16_t>(size);

			// Skip particles completely off-canvas
			if (x + sizeS <= 0 || x >= static_cast<int16_t>(width) ||
			    y + sizeS <= 0 || y >= static_cast<int16_t>(height)) {
				continue;
			}

			// Clip to canvas bounds for partially visible particles
			uint16_t clippedX = (x < 0) ? 0 : static_cast<uint16_t>(x);
			uint16_t clippedY = (y < 0) ? 0 : static_cast<uint16_t>(y);
			uint16_t clippedW = (x < 0) ? static_cast<uint16_t>(sizeS + x) : size;
			uint16_t clippedH = (y < 0) ? static_cast<uint16_t>(sizeS + y) : size;

			if (clippedX + clippedW > width) clippedW = width - clippedX;
			if (clippedY + clippedH > height) clippedH = height - clippedY;

			if (clippedW > 0 && clippedH > 0) {
				canvas.drawRectangle(clippedX, clippedY, clippedW, clippedH,
				                     CRGBA(particle.r, particle.g, particle.b, particle.alpha),
				                     BlendMode::ADDITIVE);
			}
		}
	}
}

void ExplodeEffect::reset() {
	particlePool.clear();
	explosions.clear();
}
