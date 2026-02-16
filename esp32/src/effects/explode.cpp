#include "explode.h"
#include "effect_utils.h"
#include "generated/effect_defaults.h"
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

ExplodeEffect::ExplodeEffect(const Matrix& m, Canvas& c, ParticleSystem& ps)
    : canvas(c), matrix(m), particleSystem(ps) {}

void ExplodeEffect::add(JsonDocument& props) {
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: explode missing or invalid 'color' prop");
		publishError("explode", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	uint32_t particleCount = props["particleCount"] | effect_defaults::explode::particleCount;
	float power = props["power"] | effect_defaults::explode::power;
	uint32_t lifespan = props["lifespan"] | effect_defaults::explode::lifespan;
	float powerSpread = props["powerSpread"] | effect_defaults::explode::powerSpread;
	uint32_t particleSize = props["particleSize"] | effect_defaults::explode::particleSize;
	uint32_t hueSpread = min(props["hueSpread"] | effect_defaults::explode::hueSpread, 359u);
	float friction = props["friction"] | effect_defaults::explode::friction;
	float gravity = props["gravity"] | effect_defaults::explode::gravity;
	float lifespanSpread = props["lifespanSpread"] | effect_defaults::explode::lifespanSpread;

	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

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
	RGBColor baseColor(color);
	uint8_t baseR = baseColor.r;
	uint8_t baseG = baseColor.g;
	uint8_t baseB = baseColor.b;

	// Create flash effect for LED strips (colored pulse that collapses inward)
	if (isStrip) {
		Flash flash;
		flash.centerX = centerX;
		// Flash width proportional to power, capped at 30% of canvas width
		flash.initialWidth = min(power * 0.5f, static_cast<float>(canvas.getWidth()) * 0.3f);
		flash.duration = (lifespan * 0.35f) / 1000.0f;  // 35% of lifespan, in seconds
		flash.age = 0.0f;
		flash.color = baseColor;

		flashes.add(flash);
	}

	// Add particles to the shared particle system
	for (uint32_t i = 0; i < particleCount; i++) {
		Particle p;

		p.x = centerX;
		p.y = centerY;
		p.friction = friction;
		p.gravity = gravity;
		p.size = static_cast<uint8_t>(min(particleSize, 255u));

		// Calculate power with optional variation based on powerSpread (percentage)
		float powerVariation =
			power *
			(1.0f + (static_cast<float>(hal::random(-100, 100)) / 100.0f) * (powerSpread / 100.0f));

		if (isStrip) {
			// Strip: Only horizontal movement (half go left, half go right)
			// 2x power since strips are typically longer than matrix dimensions
			float direction = (i < particleCount / 2) ? -1.0f : 1.0f;
			p.vx = direction * powerVariation * 2.0f;
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
			CRGB baseRgb(baseR, baseG, baseB);
			CHSV baseHsv = rgbToHsv(baseRgb);

			// Convert hueSpread from degrees (0-360) to 8-bit (0-255)
			uint8_t hueSpread8bit = (hueSpread * 255) / 360;

			// Apply hue spread symmetrically: random value from -spread/2 to +spread/2
			int16_t offset = static_cast<int16_t>(random8(hueSpread8bit + 1)) - (hueSpread8bit / 2);
			uint8_t particleHue = static_cast<uint8_t>(baseHsv.hue + offset);

			// Create HSV color with modified hue and convert back to RGB
			CHSV particleHsv(particleHue, baseHsv.sat, baseHsv.val);
			CRGB particleRgb = hsvToRgb(particleHsv);
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

		particleSystem.add(p);
	}
}

void ExplodeEffect::update(float deltaTime) {
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
	// Particles are updated by ParticleSystem
}

void ExplodeEffect::render() {
	uint16_t width = canvas.getWidth();

	// Render flashes for LED strips (colored pulse that collapses inward)
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
				canvas.drawPixel(leftX, 0, CRGBA(flash.color.r, flash.color.g, flash.color.b, alpha), BlendMode::ADDITIVE);
			}

			if (offset > 0 && rightX >= 0 && rightX < width) {
				canvas.drawPixel(rightX, 0, CRGBA(flash.color.r, flash.color.g, flash.color.b, alpha), BlendMode::ADDITIVE);
			}
		}
	}
	// Particles are rendered by ParticleSystem
}

void ExplodeEffect::reset() {
	flashes.clear();
	// Particles are reset by EffectProcessor calling particleSystem.reset()
}
