#pragma once

#include <ArduinoJson.h>
#include "hal/types.h"

static constexpr uint8_t GRADIENT_LUT_SIZE = 100;
static constexpr uint8_t MAX_GRADIENT_COLORS = 20;

/**
 * Parse a hex color string (e.g., "#FF0000" or "FF0000") to CRGB
 */
CRGB parseHexColor(const char* hex);

/**
 * Generate a gradient lookup table by linearly interpolating between colors.
 *
 * @param colors Array of input colors (control points)
 * @param colorCount Number of colors in the array (must be >= 2)
 * @param lut Output lookup table (must be GRADIENT_LUT_SIZE entries)
 */
void generateGradientLut(const CRGB* colors, uint8_t colorCount, CRGB* lut);

/**
 * Generate a default rainbow gradient lookup table
 *
 * @param lut Output lookup table (must be GRADIENT_LUT_SIZE entries)
 */
void generateDefaultRainbowLut(CRGB* lut);

/**
 * Result of parsing a colorGradient object from JSON
 */
struct ColorGradientResult {
	bool hasGradient;
	float speed;
	float scale;
};

/**
 * Parse a nested colorGradient object from JSON and generate LUT.
 * Expected JSON format: { "colorGradient": { "colors": [...], "speed": 3, "scale": 1 } }
 *
 * @param props JSON document containing "colorGradient" object
 * @param lut Output lookup table (must be GRADIENT_LUT_SIZE entries)
 * @return ColorGradientResult with hasGradient, speed, and scale
 */
ColorGradientResult parseColorGradientFromJson(JsonDocument& props, CRGB* lut);

/**
 * Parse a JSON gradient array and generate LUT (legacy format for plasma).
 * Returns true if gradient was parsed successfully, false if fallback to default.
 *
 * @param props JSON document containing "gradient" array
 * @param lut Output lookup table (must be GRADIENT_LUT_SIZE entries)
 * @return true if gradient was parsed from JSON, false if using default
 */
bool parseGradientFromJson(JsonDocument& props, CRGB* lut);
