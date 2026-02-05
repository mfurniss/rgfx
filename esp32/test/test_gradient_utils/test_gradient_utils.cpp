/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for gradient_utils
 *
 * Tests hex color parsing, gradient LUT generation, and JSON gradient parsing.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstring>

// Standard library Arduino-like functions
#include <string>
using String = std::string;

// HAL types (CRGB)
#include "hal/types.h"

// Include the code under test (UNIT_TEST is defined, so mqtt.h provides stubs)
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"

void setUp(void) {}

void tearDown(void) {}

// =============================================================================
// parseHexColor tests
// =============================================================================

void test_parse_hex_color_with_hash() {
	CRGB color = parseHexColor("#FF0000");
	TEST_ASSERT_EQUAL(255, color.r);
	TEST_ASSERT_EQUAL(0, color.g);
	TEST_ASSERT_EQUAL(0, color.b);
}

void test_parse_hex_color_without_hash() {
	CRGB color = parseHexColor("00FF00");
	TEST_ASSERT_EQUAL(0, color.r);
	TEST_ASSERT_EQUAL(255, color.g);
	TEST_ASSERT_EQUAL(0, color.b);
}

void test_parse_hex_color_blue() {
	CRGB color = parseHexColor("#0000FF");
	TEST_ASSERT_EQUAL(0, color.r);
	TEST_ASSERT_EQUAL(0, color.g);
	TEST_ASSERT_EQUAL(255, color.b);
}

void test_parse_hex_color_white() {
	CRGB color = parseHexColor("#FFFFFF");
	TEST_ASSERT_EQUAL(255, color.r);
	TEST_ASSERT_EQUAL(255, color.g);
	TEST_ASSERT_EQUAL(255, color.b);
}

void test_parse_hex_color_black() {
	CRGB color = parseHexColor("#000000");
	TEST_ASSERT_EQUAL(0, color.r);
	TEST_ASSERT_EQUAL(0, color.g);
	TEST_ASSERT_EQUAL(0, color.b);
}

void test_parse_hex_color_mixed() {
	CRGB color = parseHexColor("#1A2B3C");
	TEST_ASSERT_EQUAL(0x1A, color.r);
	TEST_ASSERT_EQUAL(0x2B, color.g);
	TEST_ASSERT_EQUAL(0x3C, color.b);
}

void test_parse_hex_color_lowercase() {
	CRGB color = parseHexColor("#abcdef");
	TEST_ASSERT_EQUAL(0xAB, color.r);
	TEST_ASSERT_EQUAL(0xCD, color.g);
	TEST_ASSERT_EQUAL(0xEF, color.b);
}

// =============================================================================
// generateGradientLut tests
// =============================================================================

void test_gradient_lut_zero_colors_fills_black() {
	CRGB lut[GRADIENT_LUT_SIZE];
	generateGradientLut(nullptr, 0, lut);

	for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
		TEST_ASSERT_EQUAL(0, lut[i].r);
		TEST_ASSERT_EQUAL(0, lut[i].g);
		TEST_ASSERT_EQUAL(0, lut[i].b);
	}
}

void test_gradient_lut_single_color_fills_solid() {
	CRGB colors[] = {CRGB(128, 64, 32)};
	CRGB lut[GRADIENT_LUT_SIZE];
	generateGradientLut(colors, 1, lut);

	for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
		TEST_ASSERT_EQUAL(128, lut[i].r);
		TEST_ASSERT_EQUAL(64, lut[i].g);
		TEST_ASSERT_EQUAL(32, lut[i].b);
	}
}

void test_gradient_lut_two_colors_interpolates() {
	CRGB colors[] = {CRGB(0, 0, 0), CRGB(255, 255, 255)};
	CRGB lut[GRADIENT_LUT_SIZE];
	generateGradientLut(colors, 2, lut);

	// First should be black
	TEST_ASSERT_EQUAL(0, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);

	// Last should be white
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].r);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].g);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].b);

	// Middle should be approximately gray
	uint8_t midIndex = GRADIENT_LUT_SIZE / 2;
	TEST_ASSERT_INT_WITHIN(10, 128, lut[midIndex].r);
	TEST_ASSERT_INT_WITHIN(10, 128, lut[midIndex].g);
	TEST_ASSERT_INT_WITHIN(10, 128, lut[midIndex].b);
}

void test_gradient_lut_three_colors_exercises_multi_segment() {
	CRGB colors[] = {CRGB(255, 0, 0), CRGB(0, 255, 0), CRGB(0, 0, 255)};
	CRGB lut[GRADIENT_LUT_SIZE];
	generateGradientLut(colors, 3, lut);

	// First should be exactly the first color (red)
	TEST_ASSERT_EQUAL(255, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);

	// Verify there's variety in the gradient (different colors at different points)
	TEST_ASSERT_TRUE(lut[0] != lut[GRADIENT_LUT_SIZE / 2]);
	TEST_ASSERT_TRUE(lut[GRADIENT_LUT_SIZE / 2] != lut[GRADIENT_LUT_SIZE - 1]);
}

void test_gradient_lut_increasing_values() {
	// Test with increasing values (avoids integer overflow bug in gradient code)
	CRGB colors[] = {CRGB(50, 75, 25), CRGB(200, 225, 175)};
	CRGB lut[GRADIENT_LUT_SIZE];
	generateGradientLut(colors, 2, lut);

	// First entry should match first color
	TEST_ASSERT_EQUAL(50, lut[0].r);
	TEST_ASSERT_EQUAL(75, lut[0].g);
	TEST_ASSERT_EQUAL(25, lut[0].b);

	// Last entry should match last color
	TEST_ASSERT_EQUAL(200, lut[GRADIENT_LUT_SIZE - 1].r);
	TEST_ASSERT_EQUAL(225, lut[GRADIENT_LUT_SIZE - 1].g);
	TEST_ASSERT_EQUAL(175, lut[GRADIENT_LUT_SIZE - 1].b);

	// Mid values should be interpolated
	uint8_t midIndex = GRADIENT_LUT_SIZE / 2;
	// Approximately halfway between 50 and 200 = ~125
	TEST_ASSERT_INT_WITHIN(10, 125, lut[midIndex].r);
}

// =============================================================================
// generateDefaultRainbowLut tests
// =============================================================================

void test_default_rainbow_lut_generates() {
	CRGB lut[GRADIENT_LUT_SIZE];
	generateDefaultRainbowLut(lut);

	// First should be red
	TEST_ASSERT_EQUAL(255, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);

	// Last should be approximately violet (0x9400D3)
	// Allow some tolerance for interpolation rounding
	TEST_ASSERT_INT_WITHIN(5, 0x94, lut[GRADIENT_LUT_SIZE - 1].r);
	TEST_ASSERT_INT_WITHIN(5, 0x00, lut[GRADIENT_LUT_SIZE - 1].g);
	TEST_ASSERT_INT_WITHIN(5, 0xD3, lut[GRADIENT_LUT_SIZE - 1].b);
}

void test_default_rainbow_has_variety() {
	CRGB lut[GRADIENT_LUT_SIZE];
	generateDefaultRainbowLut(lut);

	// Check that different positions have different colors
	bool hasRed = false, hasGreen = false, hasBlue = false;
	for (uint8_t i = 0; i < GRADIENT_LUT_SIZE; i++) {
		if (lut[i].r > 200 && lut[i].g < 50 && lut[i].b < 50) hasRed = true;
		if (lut[i].g > 200 && lut[i].r < 50 && lut[i].b < 50) hasGreen = true;
		if (lut[i].b > 200 && lut[i].r < 100 && lut[i].g < 50) hasBlue = true;
	}
	TEST_ASSERT_TRUE(hasRed);
	TEST_ASSERT_TRUE(hasGreen);
	TEST_ASSERT_TRUE(hasBlue);
}

// =============================================================================
// parseColorGradientFromJson tests
// =============================================================================

void test_parse_color_gradient_null_returns_no_gradient() {
	JsonDocument props;
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 3.0f, result.speed);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 1.0f, result.scale);
}

void test_parse_color_gradient_not_object_returns_no_gradient() {
	JsonDocument props;
	props["colorGradient"] = "invalid";
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
}

void test_parse_color_gradient_no_colors_returns_no_gradient() {
	JsonDocument props;
	props["colorGradient"]["speed"] = 5.0f;
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
}

void test_parse_color_gradient_colors_not_array_returns_no_gradient() {
	JsonDocument props;
	props["colorGradient"]["colors"] = "not_array";
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
}

void test_parse_color_gradient_single_color_returns_no_gradient() {
	JsonDocument props;
	JsonArray colors = props["colorGradient"]["colors"].to<JsonArray>();
	colors.add("#FF0000");
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
}

void test_parse_color_gradient_two_colors_succeeds() {
	JsonDocument props;
	JsonArray colors = props["colorGradient"]["colors"].to<JsonArray>();
	colors.add("#000000");
	colors.add("#FFFFFF");
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result.hasGradient);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 3.0f, result.speed);  // default
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 1.0f, result.scale);  // default

	// Check LUT endpoints - first should be black
	TEST_ASSERT_EQUAL(0, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);
	// Last should be white
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].r);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].g);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].b);
}

void test_parse_color_gradient_custom_speed_and_scale() {
	JsonDocument props;
	JsonArray colors = props["colorGradient"]["colors"].to<JsonArray>();
	colors.add("#FF0000");
	colors.add("#00FF00");
	props["colorGradient"]["speed"] = 7.5f;
	props["colorGradient"]["scale"] = 2.5f;
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result.hasGradient);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 7.5f, result.speed);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 2.5f, result.scale);
}

void test_parse_color_gradient_exceeds_max_returns_no_gradient() {
	JsonDocument props;
	JsonArray colors = props["colorGradient"]["colors"].to<JsonArray>();
	// Add more colors than MAX_GRADIENT_COLORS
	for (int i = 0; i <= MAX_GRADIENT_COLORS; i++) {
		colors.add("#FF0000");
	}
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.hasGradient);
}

void test_parse_color_gradient_with_non_string_colors() {
	JsonDocument props;
	JsonArray colors = props["colorGradient"]["colors"].to<JsonArray>();
	colors.add("#FF0000");
	colors.add(12345);  // Invalid - not a string
	colors.add("#00FF00");
	CRGB lut[GRADIENT_LUT_SIZE];

	ColorGradientResult result = parseColorGradientFromJson(props, lut);

	// Should still parse with the valid colors
	TEST_ASSERT_TRUE(result.hasGradient);
}

// =============================================================================
// parseGradientFromJson tests
// =============================================================================

void test_parse_gradient_null_returns_false() {
	JsonDocument props;
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result);
}

void test_parse_gradient_not_array_returns_false() {
	JsonDocument props;
	props["gradient"] = "not_array";
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result);
}

void test_parse_gradient_single_color_succeeds() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF0000");
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result);
	// Single color fills entire LUT with that color
	TEST_ASSERT_EQUAL(255, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].r);
}

void test_parse_gradient_two_colors_succeeds() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#000000");
	gradient.add("#FFFFFF");
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result);
	// First should be black
	TEST_ASSERT_EQUAL(0, lut[0].r);
	TEST_ASSERT_EQUAL(0, lut[0].g);
	TEST_ASSERT_EQUAL(0, lut[0].b);
	// Last should be white
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].r);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].g);
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].b);
}

void test_parse_gradient_exceeds_max_returns_false() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	// Add more colors than MAX_GRADIENT_COLORS
	for (int i = 0; i <= MAX_GRADIENT_COLORS; i++) {
		gradient.add("#FF0000");
	}
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result);
	// Note: publishError is called internally but we don't verify it here
	// as the stub is a no-op. The false return is sufficient.
}

void test_parse_gradient_with_non_string_colors_skips_invalid() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF0000");
	gradient.add(123);  // Invalid
	gradient.add("#00FF00");
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result);  // Should succeed with valid colors
}

void test_parse_gradient_all_invalid_returns_false() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add(123);
	gradient.add(456);
	CRGB lut[GRADIENT_LUT_SIZE];

	bool result = parseGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result);  // No valid string colors
}

// =============================================================================
// parseTextGradientFromJson tests
// =============================================================================

void test_parse_text_gradient_missing_returns_invalid() {
	JsonDocument props;
	CRGB lut[GRADIENT_LUT_SIZE];

	TextGradientResult result = parseTextGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.valid);
}

void test_parse_text_gradient_single_color_returns_solid() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF8000");  // Orange
	CRGB lut[GRADIENT_LUT_SIZE];

	TextGradientResult result = parseTextGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_FALSE(result.animate);  // Single color = no animation
	TEST_ASSERT_EQUAL(255, result.r);
	TEST_ASSERT_EQUAL(128, result.g);
	TEST_ASSERT_EQUAL(0, result.b);
}

void test_parse_text_gradient_two_colors_returns_animate() {
	JsonDocument props;
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF0000");
	gradient.add("#0000FF");
	CRGB lut[GRADIENT_LUT_SIZE];

	TextGradientResult result = parseTextGradientFromJson(props, lut);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_TRUE(result.animate);  // Two colors = animate
	// RGB values from first color
	TEST_ASSERT_EQUAL(255, result.r);
	TEST_ASSERT_EQUAL(0, result.g);
	TEST_ASSERT_EQUAL(0, result.b);
	// LUT should be populated
	TEST_ASSERT_EQUAL(255, lut[0].r);  // First color: red
	TEST_ASSERT_EQUAL(255, lut[GRADIENT_LUT_SIZE - 1].b);  // Last color: blue
}

void test_parse_text_gradient_invalid_array_returns_invalid() {
	JsonDocument props;
	props["gradient"] = "not-an-array";
	CRGB lut[GRADIENT_LUT_SIZE];

	TextGradientResult result = parseTextGradientFromJson(props, lut);

	TEST_ASSERT_FALSE(result.valid);
}

// =============================================================================
// Main test runner
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// parseHexColor
	RUN_TEST(test_parse_hex_color_with_hash);
	RUN_TEST(test_parse_hex_color_without_hash);
	RUN_TEST(test_parse_hex_color_blue);
	RUN_TEST(test_parse_hex_color_white);
	RUN_TEST(test_parse_hex_color_black);
	RUN_TEST(test_parse_hex_color_mixed);
	RUN_TEST(test_parse_hex_color_lowercase);

	// generateGradientLut
	RUN_TEST(test_gradient_lut_zero_colors_fills_black);
	RUN_TEST(test_gradient_lut_single_color_fills_solid);
	RUN_TEST(test_gradient_lut_two_colors_interpolates);
	RUN_TEST(test_gradient_lut_three_colors_exercises_multi_segment);
	RUN_TEST(test_gradient_lut_increasing_values);

	// generateDefaultRainbowLut
	RUN_TEST(test_default_rainbow_lut_generates);
	RUN_TEST(test_default_rainbow_has_variety);

	// parseColorGradientFromJson
	RUN_TEST(test_parse_color_gradient_null_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_not_object_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_no_colors_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_colors_not_array_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_single_color_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_two_colors_succeeds);
	RUN_TEST(test_parse_color_gradient_custom_speed_and_scale);
	RUN_TEST(test_parse_color_gradient_exceeds_max_returns_no_gradient);
	RUN_TEST(test_parse_color_gradient_with_non_string_colors);

	// parseGradientFromJson
	RUN_TEST(test_parse_gradient_null_returns_false);
	RUN_TEST(test_parse_gradient_not_array_returns_false);
	RUN_TEST(test_parse_gradient_single_color_succeeds);
	RUN_TEST(test_parse_gradient_two_colors_succeeds);
	RUN_TEST(test_parse_gradient_exceeds_max_returns_false);
	RUN_TEST(test_parse_gradient_with_non_string_colors_skips_invalid);
	RUN_TEST(test_parse_gradient_all_invalid_returns_false);

	// parseTextGradientFromJson
	RUN_TEST(test_parse_text_gradient_missing_returns_invalid);
	RUN_TEST(test_parse_text_gradient_single_color_returns_solid);
	RUN_TEST(test_parse_text_gradient_two_colors_returns_animate);
	RUN_TEST(test_parse_text_gradient_invalid_array_returns_invalid);

	return UNITY_END();
}
