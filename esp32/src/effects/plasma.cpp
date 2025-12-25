#include "plasma.h"
#include "hal/types.h"
#include <cmath>
#include <cstring>

PlasmaEffect::PlasmaEffect(const Matrix& m, Canvas& c)
	: state{0.0f, 0.0f, 0.0f, EnabledState::OFF, 0.0f, 0, {}}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut();
}

PlasmaEffect::EnabledState PlasmaEffect::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0) return EnabledState::OFF;
	if (strcmp(str, "on") == 0) return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0) return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0) return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

void PlasmaEffect::updateAlpha() {
	switch (state.enabledState) {
		case EnabledState::OFF:
			state.currentAlpha = 0;
			break;
		case EnabledState::ON:
			state.currentAlpha = 255;
			break;
		case EnabledState::FADE_IN: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>(progress * 255.0f);
			break;
		}
		case EnabledState::FADE_OUT: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>((1.0f - progress) * 255.0f);
			break;
		}
	}
}

CRGB PlasmaEffect::parseHexColor(const char* hex) {
	// Skip leading # if present
	if (hex[0] == '#') {
		hex++;
	}
	uint32_t rgb = strtoul(hex, nullptr, 16);
	return CRGB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
}

void PlasmaEffect::generateDefaultRainbowLut() {
	// Default rainbow: red -> orange -> yellow -> green -> blue -> indigo -> violet
	CRGB rainbow[] = {
		CRGB(0xFF, 0x00, 0x00),  // Red
		CRGB(0xFF, 0x7F, 0x00),  // Orange
		CRGB(0xFF, 0xFF, 0x00),  // Yellow
		CRGB(0x00, 0xFF, 0x00),  // Green
		CRGB(0x00, 0x00, 0xFF),  // Blue
		CRGB(0x4B, 0x00, 0x82),  // Indigo
		CRGB(0x94, 0x00, 0xD3)   // Violet
	};
	generateGradientLut(rainbow, 7);
}

void PlasmaEffect::generateGradientLut(const CRGB* colors, uint8_t colorCount) {
	if (colorCount < 2) {
		generateDefaultRainbowLut();
		return;
	}

	// Linear interpolation to fill the LUT
	for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
		// Map LUT index to position in gradient (0.0 to 1.0)
		float position = (float)i / (GRADIENT_LUT_SIZE - 1);

		// Find which segment this position falls in
		float segmentSize = 1.0f / (colorCount - 1);
		uint8_t segmentIndex = (uint8_t)(position / segmentSize);
		if (segmentIndex >= colorCount - 1) {
			segmentIndex = colorCount - 2;
		}

		// Calculate position within segment (0.0 to 1.0)
		float segmentPosition = (position - segmentIndex * segmentSize) / segmentSize;

		// Blend between segment start and end colors
		CRGB startColor = colors[segmentIndex];
		CRGB endColor = colors[segmentIndex + 1];

		state.gradientLut[i] = CRGB(
			startColor.r + (uint8_t)((endColor.r - startColor.r) * segmentPosition),
			startColor.g + (uint8_t)((endColor.g - startColor.g) * segmentPosition),
			startColor.b + (uint8_t)((endColor.b - startColor.b) * segmentPosition)
		);
	}
}

void PlasmaEffect::add(JsonDocument& props) {
	// Parse enabled - support both string and bool for backwards compat
	EnabledState enabledState = EnabledState::ON;
	if (!props["enabled"].isNull()) {
		if (props["enabled"].is<bool>()) {
			enabledState = props["enabled"].as<bool>() ? EnabledState::ON : EnabledState::OFF;
		} else if (props["enabled"].is<const char*>()) {
			enabledState = parseEnabledState(props["enabled"].as<const char*>());
		}
	}

	// If turning off instantly, just set state and return
	if (enabledState == EnabledState::OFF) {
		state.enabledState = EnabledState::OFF;
		state.currentAlpha = 0;
		return;
	}

	// Handle fadeOut - preserve existing state, just fade
	if (enabledState == EnabledState::FADE_OUT) {
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
		state.enabledState = EnabledState::FADE_OUT;
		return;
	}

	// Parse scale (0.1-10.0)
	float scale = props["scale"];
	if (scale < 0.1f) scale = 0.1f;
	if (scale > 10.0f) scale = 10.0f;

	// Parse speed
	float speed = props["speed"];

	// Parse gradient array (array of hex color strings)
	if (!props["gradient"].isNull() && props["gradient"].is<JsonArray>()) {
		JsonArray gradientArray = props["gradient"].as<JsonArray>();
		uint8_t colorCount = gradientArray.size();
		if (colorCount >= 2 && colorCount <= MAX_GRADIENT_COLORS) {
			CRGB colors[MAX_GRADIENT_COLORS];
			uint8_t validColors = 0;
			for (JsonVariant colorVal : gradientArray) {
				if (colorVal.is<const char*>() && validColors < MAX_GRADIENT_COLORS) {
					colors[validColors++] = parseHexColor(colorVal.as<const char*>());
				}
			}
			if (validColors >= 2) {
				generateGradientLut(colors, validColors);
			}
		}
	}

	state.scale = scale;
	state.speed = speed;

	// For fades, calculate starting fadeTime based on current alpha
	// This allows smooth transitions from any alpha level
	if (enabledState == EnabledState::FADE_IN) {
		// fadeTime should represent how far along we already are
		// alpha=0 -> fadeTime=0, alpha=255 -> fadeTime=FADE_DURATION
		state.fadeTime = (state.currentAlpha / 255.0f) * FADE_DURATION;
	} else if (enabledState == EnabledState::FADE_OUT) {
		// alpha=255 -> fadeTime=0, alpha=0 -> fadeTime=FADE_DURATION
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
	} else {
		state.fadeTime = 0.0f;
		// Instant on/off
		state.currentAlpha = (enabledState == EnabledState::ON) ? 255 : 0;
	}

	state.enabledState = enabledState;
}

void PlasmaEffect::update(float deltaTime) {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	// Simple time accumulation
	state.time += deltaTime * state.speed;

	// Wrap at a reasonable value to prevent float precision issues
	if (state.time > 1000.0f) {
		state.time -= 1000.0f;
	}

	// Handle fade transitions
	if (state.enabledState == EnabledState::FADE_IN || state.enabledState == EnabledState::FADE_OUT) {
		state.fadeTime += deltaTime;

		if (state.fadeTime >= FADE_DURATION) {
			// Transition to final state
			state.enabledState =
				(state.enabledState == EnabledState::FADE_IN) ? EnabledState::ON : EnabledState::OFF;
			state.fadeTime = 0.0f;
		}

		updateAlpha();
	}
}

void PlasmaEffect::render() {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	uint8_t alpha = state.currentAlpha;
	if (alpha == 0) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Scale controls noise frequency - multiply coords before passing to noise
	uint16_t noiseScale = (uint16_t)(state.scale * 3.0f);
	// Time offset for animation - third dimension of noise field
	uint16_t timeOffset = (uint16_t)(state.time * 100.0f);

	constexpr uint16_t step = 4;

	// Gradient offset rotates the palette over time for full color coverage
	int16_t gradientOffset = (int16_t)(state.time * 20.0f);

	// Strip layout: height=1, fill 4 pixels per block horizontally
	if (height == 1) {
		CRGB* pixels = canvas.getPixels();
		uint8_t invAlpha = 255 - alpha;
		for (uint16_t x = 0; x < width; x += step) {
			uint8_t noise = inoise8(x * noiseScale, 0, timeOffset);
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			CRGB color = state.gradientLut[lutIndex];
			if (alpha < 255) {
				// Alpha blend with existing pixel
				for (uint16_t i = 0; i < step; i++) {
					CRGB& p = pixels[x + i];
					p.r = (color.r * alpha + p.r * invAlpha) / 255;
					p.g = (color.g * alpha + p.g * invAlpha) / 255;
					p.b = (color.b * alpha + p.b * invAlpha) / 255;
				}
			} else {
				pixels[x] = pixels[x + 1] = pixels[x + 2] = pixels[x + 3] = color;
			}
		}
		return;
	}

	// Matrix layout: fill 4x4 blocks with alpha blending
	for (uint16_t y = 0; y < height; y += step) {
		for (uint16_t x = 0; x < width; x += step) {
			// 3D Perlin noise: x, y for position, time for animation
			uint8_t noise = inoise8(x * noiseScale, y * noiseScale, timeOffset);

			// Map noise (0-255) + offset to LUT index (0-99)
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			CRGB color = state.gradientLut[lutIndex];
			canvas.fillBlock4x4Alpha(x, y, color, alpha);
		}
	}
}

void PlasmaEffect::reset() {
	state.enabledState = EnabledState::OFF;
	state.time = 0.0f;
	state.scale = 0.0f;
	state.speed = 0.0f;
	state.fadeTime = 0.0f;
	state.currentAlpha = 0;
	generateDefaultRainbowLut();
}

bool PlasmaEffect::isFullyOpaque() const {
	return state.currentAlpha == 255;
}
