#include "gradient_utils.h"
#include <cstdlib>
#include "network/mqtt.h"

CRGB parseHexColor(const char* hex) {
	// Skip leading # if present
	if (hex[0] == '#') {
		hex++;
	}
	uint32_t rgb = strtoul(hex, nullptr, 16);
	return CRGB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
}

void generateGradientLut(const CRGB* colors, uint8_t colorCount, CRGB* lut) {
	if (colorCount == 0) {
		// No colors - fill with black
		for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
			lut[i] = CRGB(0, 0, 0);
		}
		return;
	}

	if (colorCount == 1) {
		// Single color - fill entire LUT with that color
		for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
			lut[i] = colors[0];
		}
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

		lut[i] = CRGB(
			startColor.r + (uint8_t)((endColor.r - startColor.r) * segmentPosition),
			startColor.g + (uint8_t)((endColor.g - startColor.g) * segmentPosition),
			startColor.b + (uint8_t)((endColor.b - startColor.b) * segmentPosition)
		);
	}
}

void generateDefaultRainbowLut(CRGB* lut) {
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
	generateGradientLut(rainbow, 7, lut);
}

ColorGradientResult parseColorGradientFromJson(JsonDocument& props, CRGB* lut) {
	ColorGradientResult result = {false, 3.0f, 1.0f};

	JsonVariant colorGradient = props["colorGradient"];
	if (colorGradient.isNull() || !colorGradient.is<JsonObject>()) {
		return result;
	}

	JsonVariant colorsVariant = colorGradient["colors"];
	if (colorsVariant.isNull() || !colorsVariant.is<JsonArray>()) {
		return result;
	}

	JsonArray colorsArray = colorsVariant.as<JsonArray>();
	uint8_t colorCount = colorsArray.size();
	if (colorCount < 2 || colorCount > MAX_GRADIENT_COLORS) {
		return result;
	}

	CRGB colors[MAX_GRADIENT_COLORS];
	uint8_t validColors = 0;
	for (JsonVariant colorVal : colorsArray) {
		if (colorVal.is<const char*>() && validColors < MAX_GRADIENT_COLORS) {
			colors[validColors++] = parseHexColor(colorVal.as<const char*>());
		}
	}

	if (validColors < 2) {
		return result;
	}

	generateGradientLut(colors, validColors, lut);
	result.hasGradient = true;
	result.speed = colorGradient["speed"] | 3.0f;
	result.scale = colorGradient["scale"] | 1.0f;
	return result;
}

bool parseGradientFromJson(JsonDocument& props, CRGB* lut) {
	if (!props["gradient"].isNull() && props["gradient"].is<JsonArray>()) {
		JsonArray gradientArray = props["gradient"].as<JsonArray>();
		uint8_t colorCount = gradientArray.size();

		if (colorCount > MAX_GRADIENT_COLORS) {
			publishError("plasma", "gradient exceeds MAX_GRADIENT_COLORS");
			return false;
		}

		if (colorCount >= 2) {
			CRGB colors[MAX_GRADIENT_COLORS];
			uint8_t validColors = 0;
			for (JsonVariant colorVal : gradientArray) {
				if (colorVal.is<const char*>() && validColors < MAX_GRADIENT_COLORS) {
					colors[validColors++] = parseHexColor(colorVal.as<const char*>());
				}
			}
			if (validColors >= 2) {
				generateGradientLut(colors, validColors, lut);
				return true;
			}
		}
	}
	return false;
}
