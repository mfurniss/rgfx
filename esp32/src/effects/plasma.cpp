#include "plasma.h"
#include "hal/types.h"
#include <cmath>

static const float DEFAULT_SCALE = 3.0f;
static const float DEFAULT_SPEED = 2.0f;

PlasmaEffect::PlasmaEffect(const Matrix& m, Canvas& c)
	: state{0.0f, DEFAULT_SCALE, DEFAULT_SPEED, false, {}}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut();
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
	// Parse enabled flag (default to true if not specified)
	bool enabled = true;
	if (!props["enabled"].isNull() && props["enabled"].is<bool>()) {
		enabled = props["enabled"].as<bool>();
	}

	// If disabling, just set enabled false and return
	if (!enabled) {
		state.enabled = false;
		return;
	}

	// Parse scale (0.1-10.0, default 3.0)
	float scale = DEFAULT_SCALE;
	if (!props["scale"].isNull()) {
		scale = props["scale"].as<float>();
		if (scale < 0.1f) scale = 0.1f;
		if (scale > 10.0f) scale = 10.0f;
	}

	// Parse speed
	float speed = DEFAULT_SPEED;
	if (!props["speed"].isNull()) {
		speed = props["speed"].as<float>();
	}

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
	state.enabled = enabled;
}

void PlasmaEffect::update(float deltaTime) {
	if (!state.enabled) {
		return;
	}

	// Simple time accumulation
	state.time += deltaTime * state.speed;

	// Wrap at a reasonable value to prevent float precision issues
	if (state.time > 1000.0f) {
		state.time -= 1000.0f;
	}
}

void PlasmaEffect::render() {
	if (!state.enabled) {
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
		for (uint16_t x = 0; x < width; x += step) {
			uint8_t noise = inoise8(x * noiseScale, 0, timeOffset);
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			CRGB color = state.gradientLut[lutIndex];
			pixels[x] = pixels[x + 1] = pixels[x + 2] = pixels[x + 3] = color;
		}
		return;
	}

	// Matrix layout: fill 4x4 blocks
	for (uint16_t y = 0; y < height; y += step) {
		for (uint16_t x = 0; x < width; x += step) {
			// 3D Perlin noise: x, y for position, time for animation
			uint8_t noise = inoise8(x * noiseScale, y * noiseScale, timeOffset);

			// Map noise (0-255) + offset to LUT index (0-99)
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			canvas.fillBlock4x4(x, y, state.gradientLut[lutIndex]);
		}
	}
}

void PlasmaEffect::reset() {
	state.enabled = false;
	state.time = 0.0f;
	state.scale = DEFAULT_SCALE;
	state.speed = DEFAULT_SPEED;
	generateDefaultRainbowLut();
}
