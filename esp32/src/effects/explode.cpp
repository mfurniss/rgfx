#include "explode.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "hal/types.h"
#include "graphics/canvas.h"
#include "utils/easing.h"
#include "network/mqtt.h"
#include <algorithm>
#include <cmath>
#include <cstring>

namespace {
// Parse coordinate as percentage (0-100) or "random" string
// Returns -1 if prop is missing/invalid
float parseCoordPercent(JsonVariant prop) {
	if (prop.is<const char*>()) {
		const char* str = prop.as<const char*>();
		if (strcmp(str, "random") == 0) {
			return static_cast<float>(hal::random(101));  // 0-100
		}
	}
	if (prop.is<float>() || prop.is<int>()) {
		return prop.as<float>();
	}
	return -1.0f;  // Invalid
}
}  // namespace

ExplodeEffect::ExplodeEffect(const Matrix& m, Canvas& c) : canvas(c), matrix(m), head(0) {
	// Initialize all particles as dead (alpha = 0)
	memset(particlePool, 0, sizeof(particlePool));
	flashes.reserve(16);
}

void ExplodeEffect::add(JsonDocument& props) {
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: explode missing or invalid 'color' prop");
		publishError("explode", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	uint32_t particleCount = min(static_cast<uint32_t>(props["particleCount"]), MAX_PARTICLES);
	float power = props["power"];
	uint32_t lifespan = props["lifespan"];
	float powerSpread = props["powerSpread"];
	uint32_t particleSize = props["particleSize"];
	uint32_t hueSpread = min(static_cast<uint32_t>(props["hueSpread"]), 359u);
	float friction = props["friction"];
	float gravity = props["gravity"];
	float lifespanSpread = props["lifespanSpread"];

	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Scale velocity based on largest dimension (normalized to 60px reference)
	uint16_t largestDimension =
		isStrip ? canvas.getWidth() : max(canvas.getWidth(), canvas.getHeight());
	float velocityScale = largestDimension / 60.0f;

	// Parse center position as percentage (0-100) or "random"
	float centerXPercent = parseCoordPercent(props["centerX"]);
	if (centerXPercent < 0) {
		hal::log("ERROR: explode missing required 'centerX' prop");
		publishError("explode", "missing required 'centerX' prop (numeric 0-100 or \"random\")", props);
		return;
	}
	float centerX = (centerXPercent / 100.0f) * canvas.getWidth();

	float centerY;
	if (isStrip) {
		centerY = canvas.getHeight() / 2.0f;
	} else {
		float centerYPercent = parseCoordPercent(props["centerY"]);
		if (centerYPercent < 0) {
			hal::log("ERROR: explode missing required 'centerY' prop");
			publishError("explode", "missing required 'centerY' prop (numeric 0-100 or \"random\")", props);
			return;
		}
		centerY = (centerYPercent / 100.0f) * canvas.getHeight();
	}

	// Extract RGB components
	uint8_t baseR = (color >> 16) & 0xFF;
	uint8_t baseG = (color >> 8) & 0xFF;
	uint8_t baseB = color & 0xFF;

	// Create flash effect for LED strips (colored pulse that collapses inward)
	if (isStrip) {
		Flash flash;
		flash.centerX = centerX;
		// Flash width proportional to power, capped at 30% of canvas width
		flash.initialWidth = min(power * 0.5f, static_cast<float>(canvas.getWidth()) * 0.3f);
		flash.duration = (lifespan * 0.35f) / 1000.0f;  // 35% of lifespan, in seconds
		flash.age = 0.0f;
		flash.r = baseR;
		flash.g = baseG;
		flash.b = baseB;
		flashes.push_back(flash);
	}

	// Ring buffer: write particles at head, wrapping around (overwrites oldest)
	for (uint32_t i = 0; i < particleCount; i++) {
		Particle& p = particlePool[head];

		p.x = centerX;
		p.y = centerY;
		p.friction = friction;
		p.gravity = gravity * velocityScale * 2.0f;
		p.particleSize = static_cast<uint8_t>(min(particleSize, 255u));

		// Calculate power with optional variation based on powerSpread (percentage)
		float powerVariation =
			power *
			(1.0f + (static_cast<float>(hal::random(-100, 100)) / 100.0f) * (powerSpread / 100.0f));

		if (isStrip) {
			// Strip: Only horizontal movement (half go left, half go right)
			float direction = (i < particleCount / 2) ? -1.0f : 1.0f;
			p.vx = direction * powerVariation * velocityScale;
			p.vy = 0.0f;
		} else {
			// Matrix: Full 2D explosion with radial distribution
			float angle = (static_cast<float>(i) / particleCount) * 2.0f * PI;
			angle += (static_cast<float>(hal::random(-100, 100)) / 100.0f) * 0.3f;
			// Apply uniform scaling to maintain circular shape
			p.vx = cos(angle) * powerVariation * velocityScale;
			p.vy = sin(angle) * powerVariation * velocityScale;
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

		// Apply lifespan variation symmetrically around lifespan (percentage: 0=none, 100=±100%)
		if (lifespanSpread < 0.01f) {
			p.lifespan = lifespan;
		} else {
			float spreadAmount = lifespan * (lifespanSpread / 100.0f);
			float variation = (static_cast<float>(hal::random(0, 200)) / 100.0f) - 1.0f;  // -1.0 to 1.0
			float calculatedLifespan = lifespan + variation * spreadAmount;
			p.lifespan = static_cast<uint32_t>(max(50.0f, calculatedLifespan));
		}

		// Advance head (ring buffer wrap)
		head = (head + 1) % MAX_PARTICLES;
	}
}

void ExplodeEffect::update(float deltaTime) {
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Update and remove expired flashes (swap-and-pop for O(1) removal)
	for (size_t i = 0; i < flashes.size();) {
		flashes[i].age += deltaTime;
		if (flashes[i].age >= flashes[i].duration) {
			flashes[i] = flashes.back();
			flashes.pop_back();
		} else {
			++i;
		}
	}

	// Update all particles in the ring buffer (skip dead particles with alpha=0)
	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		Particle& p = particlePool[i];

		// Skip dead particles
		if (p.alpha == 0) {
			continue;
		}

		// Update X position (always) - friction is stored per-particle
		p.x += p.vx * deltaTime;
		p.vx *= (1.0f - (p.friction * deltaTime));

		// Update Y position (only for matrices)
		if (!isStrip) {
			p.vy += p.gravity * deltaTime;  // Apply gravity acceleration
			p.y += p.vy * deltaTime;
			p.vy *= (1.0f - (p.friction * deltaTime));
		}

		// Age the particle
		p.age += deltaTimeMs;

		// Check if particle is dead or out of bounds
		bool outOfBounds;
		if (isStrip) {
			outOfBounds = (p.x < 0 || p.x >= width);
		} else {
			outOfBounds = (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height);
		}

		if (p.age >= p.lifespan || outOfBounds) {
			// Mark as dead (will be skipped in render, overwritten by new particles)
			p.alpha = 0;
		} else {
			// Fade based on age
			float lifeProgress = static_cast<float>(p.age) / p.lifespan;
			p.alpha = static_cast<uint8_t>(255.0f * (1.0f - lifeProgress));
		}
	}
}

void ExplodeEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Render flashes first for LED strips (white pulse that collapses inward)
	for (const auto& flash : flashes) {
		if (flash.initialWidth <= 0.0f) {
			continue;
		}

		float progress = flash.age / flash.duration;
		float easedProgress = quarticEaseOutf(progress);
		float currentHalfWidth = (flash.initialWidth * 0.5f) * (1.0f - easedProgress);
		if (currentHalfWidth < 1.0f) {
			continue;
		}
		float maxAlpha = 150.0f * (1.0f - easedProgress);
		float alphaPerPixel = maxAlpha / currentHalfWidth;

		// Draw from center outward (both directions)
		int16_t centerX = static_cast<int16_t>(flash.centerX);

		for (int16_t offset = 0; offset <= static_cast<int16_t>(currentHalfWidth); offset++) {
			uint8_t alpha = static_cast<uint8_t>(maxAlpha - offset * alphaPerPixel);
			int16_t leftX = centerX - offset;
			int16_t rightX = centerX + offset;

			if (leftX >= 0 && leftX < width) {
				canvas.drawPixel(leftX, 0, CRGBA(flash.r, flash.g, flash.b, alpha), BlendMode::ADDITIVE);
			}

			if (offset > 0 && rightX >= 0 && rightX < width) {
				canvas.drawPixel(rightX, 0, CRGBA(flash.r, flash.g, flash.b, alpha), BlendMode::ADDITIVE);
			}
		}
	}

	// Render all live particles from the ring buffer (skip dead particles with alpha=0)
	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		const Particle& particle = particlePool[i];

		// Skip dead particles
		if (particle.alpha == 0) {
			continue;
		}

		uint8_t size = particle.particleSize;
		int16_t halfSize = size / 2;

		// Convert float position to integer canvas coordinates (center of particle)
		int16_t centerX = static_cast<int16_t>(particle.x);
		int16_t centerY = static_cast<int16_t>(particle.y);

		if (isStrip) {
			// Strip: Render full-height column for particle
			for (uint32_t dx = 0; dx < size; dx++) {
				int16_t x = centerX - halfSize + dx;

				if (x >= 0 && x < width) {
					canvas.drawRectangle(x, static_cast<int16_t>(0), static_cast<int16_t>(1),
					                     static_cast<int16_t>(height),
					                     CRGBA(particle.r, particle.g, particle.b, particle.alpha),
					                     BlendMode::ADDITIVE);
				}
			}
		} else {
			// Matrix: Render NxN block centered around position
			int16_t x = centerX - halfSize;
			int16_t y = centerY - halfSize;
			int16_t sizeS = static_cast<int16_t>(size);

			// Canvas handles all clipping safely via signed drawRectangle API
			canvas.drawRectangle(x, y, sizeS, sizeS,
			                     CRGBA(particle.r, particle.g, particle.b, particle.alpha),
			                     BlendMode::ADDITIVE);
		}
	}
}

void ExplodeEffect::reset() {
	// Mark all particles as dead by setting alpha=0
	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		particlePool[i].alpha = 0;
	}
	head = 0;
	flashes.clear();
}
