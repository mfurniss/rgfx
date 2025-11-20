#include "explosion.h"
#include "effect_utils.h"
#include "canvas.h"
#include <algorithm>
#include <cmath>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_PARTICLE_COUNT = 80;
static const float DEFAULT_POWER = 50.0f;
static const uint32_t DEFAULT_LIFESPAN = 1200;
static const float DEFAULT_POWER_SPREAD = 1.5f;
static const uint32_t DEFAULT_PARTICLE_SIZE = 2;

ExplosionEffect::ExplosionEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4) {}

void ExplosionEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t particleCount = props["particleCount"] | DEFAULT_PARTICLE_COUNT;
	float power = props["power"] | DEFAULT_POWER;
	uint32_t lifespan = props["lifespan"] | DEFAULT_LIFESPAN;
	float powerSpread = props["powerSpread"] | DEFAULT_POWER_SPREAD;
	uint32_t particleSize = props["particleSize"] | DEFAULT_PARTICLE_SIZE;

	// Parse center position as percentage (0-100), default to center (50%)
	float centerXPercent = props["centerX"] | 50.0f;
	float centerYPercent = props["centerY"] | 50.0f;

	// Convert percentage to canvas coordinates
	float centerX = (centerXPercent / 100.0f) * canvas.getWidth();
	float centerY = (centerYPercent / 100.0f) * canvas.getHeight();

	// Extract RGB components
	uint8_t r = (color >> 16) & 0xFF;
	uint8_t g = (color >> 8) & 0xFF;
	uint8_t b = color & 0xFF;

	// Create new explosion
	Explosion newExplosion;
	newExplosion.centerX = centerX;
	newExplosion.centerY = centerY;
	newExplosion.particleSize = particleSize;

	// Generate particles with randomized velocities
	for (uint32_t i = 0; i < particleCount; i++) {
		Particle p;
		p.x = centerX;
		p.y = centerY;

		// Calculate angle for this particle (evenly distributed around 360°)
		float angle = (static_cast<float>(i) / particleCount) * 2.0f * PI;

		// Add random variation to angle for more natural spread
		angle += (static_cast<float>(random(-100, 100)) / 100.0f) * 0.3f;

		// Calculate velocity with power variation based on powerSpread
		float powerVariation = power * (1.0f + (static_cast<float>(random(-100, 100)) / 100.0f) * (powerSpread - 1.0f));
		p.vx = cos(angle) * powerVariation;
		p.vy = sin(angle) * powerVariation;

		p.r = r;
		p.g = g;
		p.b = b;
		p.alpha = 255;
		p.lifespan = lifespan;
		p.age = 0;

		newExplosion.particles.push_back(p);
	}

	explosions.push_back(newExplosion);
}

void ExplosionEffect::update(float deltaTime) {
	canvas.clear();

	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	// Update all explosions
	for (auto expIt = explosions.begin(); expIt != explosions.end();) {
		// Update particles in this explosion
		for (auto partIt = expIt->particles.begin(); partIt != expIt->particles.end();) {
			// Update position based on velocity
			partIt->x += partIt->vx * deltaTime;
			partIt->y += partIt->vy * deltaTime;

			// Age the particle
			partIt->age += deltaTimeMs;

			// Calculate alpha based on remaining life
			if (partIt->age >= partIt->lifespan) {
				partIt = expIt->particles.erase(partIt);
			} else {
				// Linear fade: alpha = 255 * (1 - age/lifespan)
				float lifeProgress = static_cast<float>(partIt->age) / partIt->lifespan;
				partIt->alpha = static_cast<uint8_t>(255.0f * (1.0f - lifeProgress));
				++partIt;
			}
		}

		// Remove explosion if all particles are dead
		if (expIt->particles.empty()) {
			expIt = explosions.erase(expIt);
		} else {
			++expIt;
		}
	}
}

void ExplosionEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Render all particles from all explosions with configurable size
	for (const auto& explosion : explosions) {
		uint32_t size = explosion.particleSize;
		int16_t halfSize = size / 2;
		for (const auto& particle : explosion.particles) {
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
}

void ExplosionEffect::reset() {
	explosions.clear();
}

Canvas& ExplosionEffect::getCanvas() {
	return canvas;
}
