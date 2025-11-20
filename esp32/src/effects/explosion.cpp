#include "explosion.h"
#include "effect_utils.h"
#include "canvas.h"
#include <FastLED.h>
#include <algorithm>
#include <cmath>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_PARTICLE_COUNT = 100;
static const float DEFAULT_POWER = 60.0f;
static const uint32_t DEFAULT_LIFESPAN = 800;
static const float DEFAULT_POWER_SPREAD = 1.6f;
static const uint32_t DEFAULT_PARTICLE_SIZE = 2;
static const uint32_t DEFAULT_HUE_SPREAD = 0;
static const uint32_t MAX_PARTICLE_POOL_SIZE = 500;

ExplosionEffect::ExplosionEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4), nextExplosionId(0) {
	particlePool.reserve(MAX_PARTICLE_POOL_SIZE);
}

void ExplosionEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t particleCount = props["particleCount"] | DEFAULT_PARTICLE_COUNT;
	particleCount = min(particleCount, MAX_PARTICLE_POOL_SIZE);
	float power = props["power"] | DEFAULT_POWER;
	uint32_t lifespan = props["lifespan"] | DEFAULT_LIFESPAN;
	float powerSpread = props["powerSpread"] | DEFAULT_POWER_SPREAD;
	uint32_t particleSize = props["particleSize"] | DEFAULT_PARTICLE_SIZE;
	uint32_t hueSpread = min(static_cast<uint32_t>(props["hueSpread"] | DEFAULT_HUE_SPREAD), 359u);

	// Parse center position as percentage (0-100), default to center (50%)
	float centerXPercent = props["centerX"] | 50.0f;
	float centerYPercent = props["centerY"] | 50.0f;

	// Convert percentage to canvas coordinates
	float centerX = (centerXPercent / 100.0f) * canvas.getWidth();
	float centerY = (centerYPercent / 100.0f) * canvas.getHeight();

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

		// Calculate angle for this particle (evenly distributed around 360°)
		float angle = (static_cast<float>(i) / particleCount) * 2.0f * PI;

		// Add random variation to angle for more natural spread
		angle += (static_cast<float>(random(-100, 100)) / 100.0f) * 0.3f;

		// Calculate velocity with power variation based on powerSpread
		float powerVariation = power * (1.0f + (static_cast<float>(random(-100, 100)) / 100.0f) * (powerSpread - 1.0f));
		p.vx = cos(angle) * powerVariation;
		p.vy = sin(angle) * powerVariation;

		// Apply hue spread if non-zero
		if (hueSpread > 0) {
			// Convert to HSV for hue manipulation
			CRGB baseRgb(baseR, baseG, baseB);
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
			p.r = particleRgb.r;
			p.g = particleRgb.g;
			p.b = particleRgb.b;
		} else {
			// No hue spread - use original RGB color directly
			p.r = baseR;
			p.g = baseG;
			p.b = baseB;
		}

		p.alpha = 255;
		p.lifespan = lifespan;
		p.age = 0;

		particlePool.push_back(p);
	}

	explosions.push_back(newExplosion);
}

void ExplosionEffect::update(float deltaTime) {
	canvas.clear();

	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Update all particles in the shared pool
	for (auto partIt = particlePool.begin(); partIt != particlePool.end();) {
		// Update position based on velocity
		partIt->x += partIt->vx * deltaTime;
		partIt->y += partIt->vy * deltaTime;

		// Age the particle
		partIt->age += deltaTimeMs;

		// Remove particles that are dead or out of bounds
		if (partIt->age >= partIt->lifespan ||
		    partIt->x < 0 || partIt->x >= width ||
		    partIt->y < 0 || partIt->y >= height) {
			partIt = particlePool.erase(partIt);
		} else {
			// Linear fade: alpha = 255 * (1 - age/lifespan)
			float lifeProgress = static_cast<float>(partIt->age) / partIt->lifespan;
			partIt->alpha = static_cast<uint8_t>(255.0f * (1.0f - lifeProgress));
			++partIt;
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

void ExplosionEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

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

		// Render particle as NxN block centered around position
		for (uint32_t dy = 0; dy < size; dy++) {
			for (uint32_t dx = 0; dx < size; dx++) {
				int16_t x = centerX - halfSize + dx;
				int16_t y = centerY - halfSize + dy;

				// Bounds check
				if (x < 0 || x >= width || y < 0 || y >= height) {
					continue;
				}

				uint32_t existing = canvas.getPixel(x, y);

				// Alpha blend particle onto canvas
				uint8_t existingR = RGBA_RED(existing);
				uint8_t existingG = RGBA_GREEN(existing);
				uint8_t existingB = RGBA_BLUE(existing);
				uint8_t existingA = RGBA_ALPHA(existing);

				uint8_t newR = ((existingR * (255 - particle.alpha)) + (particle.r * particle.alpha)) / 255;
				uint8_t newG = ((existingG * (255 - particle.alpha)) + (particle.g * particle.alpha)) / 255;
				uint8_t newB = ((existingB * (255 - particle.alpha)) + (particle.b * particle.alpha)) / 255;
				uint8_t newA = existingA + particle.alpha - ((existingA * particle.alpha) / 255);

				canvas.setPixel(x, y, RGBA(newR, newG, newB, newA));
			}
		}
	}
}

void ExplosionEffect::reset() {
	particlePool.clear();
	explosions.clear();
}

Canvas& ExplosionEffect::getCanvas() {
	return canvas;
}
