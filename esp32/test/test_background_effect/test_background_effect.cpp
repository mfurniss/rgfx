/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for BackgroundEffect
 *
 * Tests singleton background behavior, color changes, and render order.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <algorithm>

// Standard library Arduino-like functions
#include <string>
using String = std::string;

// HAL types (CRGB, fill_solid, etc.)
#include "hal/types.h"

// HAL test headers
#include "hal/test/test_platform.h"

// HAL platform for millis/random
#include "hal/platform.h"

// Include HAL implementations
#include "hal/test/platform.cpp"

// Include graphics
#include "graphics/canvas.h"
#include "graphics/canvas.cpp"
#include "graphics/coordinate_transforms.h"
#include "graphics/coordinate_transforms.cpp"
#include "graphics/matrix.h"
#include "graphics/matrix.cpp"

// Include utils
#include "effects/effect_utils.h"
#include "effects/effect_utils.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/background.h"
#include "effects/background.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"
#include "helpers/downsample_test_helpers.h"
#include "helpers/pixel_digest.h"

using namespace test_helpers;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// 1. Basic Creation & Defaults
// =============================================================================

void test_background_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_background_not_enabled_by_default() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// Without calling add(), background is not enabled
	canvas.clear();
	effect.render();

	// Should render nothing
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_add_enables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FF0000";  // Red

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should fill entire canvas
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_background_reset_disables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	effect.add(props);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	effect.reset();
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 2. Singleton Behavior Tests
// =============================================================================

void test_background_singleton_replaces_previous() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First color - red
	JsonDocument props1;
	props1["color"] = "#FF0000";
	effect.add(props1);

	// Second color - green (should replace red)
	JsonDocument props2;
	props2["color"] = "#00FF00";
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Should only have green, not red
	int redPixels = countRedDominantPixels(canvas);
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_EQUAL(0, redPixels);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

void test_background_multiple_add_calls() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// Add multiple times
	for (int i = 0; i < 10; i++) {
		JsonDocument props;
	setDefaultBackgroundProps(props);
		props["color"] = "#FFFFFF";
		effect.add(props);
	}

	// Should still just have one background
	canvas.clear();
	effect.render();

	// All pixels should be white
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

// =============================================================================
// 3. Color Tests
// =============================================================================

void test_background_color_red() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FF0000";
	effect.add(props);

	canvas.clear();
	effect.render();

	// All pixels should be red
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), redPixels);
}

void test_background_color_green() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#00FF00";
	effect.add(props);

	canvas.clear();
	effect.render();

	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), greenPixels);
}

void test_background_color_blue() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#0000FF";
	effect.add(props);

	canvas.clear();
	effect.render();

	int bluePixels = countBlueDominantPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), bluePixels);
}

void test_background_color_black_default() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	// No color specified - should default to black
	effect.add(props);

	canvas.clear();
	effect.render();

	// Black background on cleared canvas = no visible pixels
	// But background IS enabled, it's just black
	// The canvas was cleared to black, and background fills with black
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_white() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Check that pixels have all channels high
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
	TEST_ASSERT_EQUAL(255, pixel.g);
	TEST_ASSERT_EQUAL(255, pixel.b);
}

// =============================================================================
// 4. Enable/Disable Tests (using new string enum)
// =============================================================================

void test_background_enabled_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FF0000";
	props["enabled"] = "on";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_background_enabled_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First enable
	JsonDocument props1;
	props1["color"] = "#FF0000";
	effect.add(props1);

	// Then disable with "off"
	JsonDocument props2;
	props2["enabled"] = "off";
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Background disabled - no pixels
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_enabled_bool_backwards_compat() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// Test bool true (backwards compat)
	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["enabled"] = true;
	effect.add(props1);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Test bool false (backwards compat)
	JsonDocument props2;
	props2["enabled"] = false;
	effect.add(props2);

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_re_enable_after_disable() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// Enable
	JsonDocument props1;
	props1["color"] = "#FF0000";
	effect.add(props1);

	// Disable
	JsonDocument props2;
	props2["enabled"] = "off";
	effect.add(props2);

	// Re-enable with new color
	JsonDocument props3;
	props3["color"] = "#00FF00";
	props3["enabled"] = "on";
	effect.add(props3);

	canvas.clear();
	effect.render();

	// Should have green background
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

// =============================================================================
// 5. Update Behavior Tests
// =============================================================================

void test_background_update_does_nothing_when_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "on";
	effect.add(props);

	// Update should not affect background when just "on"
	effect.update(1.0f);
	effect.update(10.0f);

	canvas.clear();
	effect.render();

	// Should still render at full brightness
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
	TEST_ASSERT_EQUAL(255, pixel.g);
	TEST_ASSERT_EQUAL(255, pixel.b);
}

// =============================================================================
// 6. Fade Tests (using enabled: fadeIn/fadeOut)
// =============================================================================

void test_background_fadeIn_starts_dark() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "fadeIn";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should start at zero brightness
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(0, pixel.r);
	TEST_ASSERT_EQUAL(0, pixel.g);
	TEST_ASSERT_EQUAL(0, pixel.b);
}

void test_background_fadeIn_brightens() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "fadeIn";
	effect.add(props);

	// Advance halfway through fade (0.5s of 1s)
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should be at roughly half brightness
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_TRUE(pixel.r > 100 && pixel.r < 150);

	// Advance to full fade
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should be at full brightness
	pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
}

void test_background_fadeIn_transitions_to_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "fadeIn";
	effect.add(props);

	// Complete the fade
	effect.update(1.0f);

	canvas.clear();
	effect.render();

	// Should be at full brightness and stay there
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);

	// Further updates shouldn't change anything
	effect.update(5.0f);
	canvas.clear();
	effect.render();

	pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
}

void test_background_fadeOut_starts_bright() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First enable the effect at full brightness
	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "on";
	effect.add(props);

	// Then trigger fadeOut - should start from current alpha (255)
	props["enabled"] = "fadeOut";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should start at full brightness
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
}

void test_background_fadeOut_dims() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First enable the effect at full brightness
	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "on";
	effect.add(props);

	// Then trigger fadeOut
	props["enabled"] = "fadeOut";
	effect.add(props);

	// Advance halfway through fade
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should be at roughly half brightness
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_TRUE(pixel.r > 100 && pixel.r < 150);

	// Advance to end of fade
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should be dark
	pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(0, pixel.r);
}

void test_background_fadeOut_transitions_to_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First enable the effect at full brightness
	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	props["enabled"] = "on";
	effect.add(props);

	// Then trigger fadeOut
	props["enabled"] = "fadeOut";
	effect.add(props);

	// Complete the fade
	effect.update(1.0f);

	canvas.clear();
	effect.render();

	// Should be off
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// Should stay off
	effect.update(5.0f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 7. Canvas Coverage Tests
// =============================================================================

void test_background_fills_entire_canvas() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#808080";  // Gray
	effect.add(props);

	canvas.clear();
	effect.render();

	// Check all pixels
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			TEST_ASSERT_TRUE(isNonBlack(pixel));
		}
	}
}

void test_background_large_matrix() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#123456";
	effect.add(props);

	canvas.clear();
	effect.render();

	// All 64x64 canvas pixels should be filled
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_background_strip_layout() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FF00FF";  // Magenta
	effect.add(props);

	canvas.clear();
	effect.render();

	// Strip should be fully filled
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth(), pixelCount);
}

// =============================================================================
// 8. Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runBackgroundDigest(const TestConfig& config, float updateTime,
                                     const char* color = "#00FFFF") {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = color;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_background_digest_16x16_t100() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[1], 0.1f);
	assertDigest(0x449F87B310EE9325ull, digest, "background_16x16_t100");
}

void test_background_digest_16x16_t200_different_color() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[1], 0.2f, "#FF00FF");
	assertDigest(0x838E1B28F1BC7F25ull, digest, "background_16x16_t200_magenta");
}

void test_background_digest_strip_t150() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[0], 0.15f);
	assertDigest(0x87B8F27F94FBAE65ull, digest, "background_strip_t150");
}

void test_background_digest_96x8_t100() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[2], 0.1f);
	assertDigest(0xC025E4EF5A477325ull, digest, "background_96x8_t100");
}

void test_background_property_static_no_change() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = "#FFFFFF";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash1 = computeFrameDigest(matrix);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash2 = computeFrameDigest(matrix);

	// Static background should not change between frames
	TEST_ASSERT_EQUAL_HEX64_MESSAGE(hash1, hash2, "Static background should not change");
}

void test_background_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		BackgroundEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultBackgroundProps(props);
		props["color"] = "#808080";
		effect.add(props);

		effect.update(0.1f);
		canvas.clear();
		effect.render();
		downsampleToMatrix(canvas, &matrix);

		FrameProperties fp = analyzeFrame(matrix);
		char msg[64];
		snprintf(msg, sizeof(msg), "Config %zu should have pixels", i);
		TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels, msg);
	}
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// 1. Basic Creation & Defaults
	RUN_TEST(test_background_creation);
	RUN_TEST(test_background_not_enabled_by_default);
	RUN_TEST(test_background_add_enables);
	RUN_TEST(test_background_reset_disables);

	// 2. Singleton Behavior Tests
	RUN_TEST(test_background_singleton_replaces_previous);
	RUN_TEST(test_background_multiple_add_calls);

	// 3. Color Tests
	RUN_TEST(test_background_color_red);
	RUN_TEST(test_background_color_green);
	RUN_TEST(test_background_color_blue);
	RUN_TEST(test_background_color_black_default);
	RUN_TEST(test_background_white);

	// 4. Enable/Disable Tests
	RUN_TEST(test_background_enabled_on);
	RUN_TEST(test_background_enabled_off);
	RUN_TEST(test_background_enabled_bool_backwards_compat);
	RUN_TEST(test_background_re_enable_after_disable);

	// 5. Update Behavior Tests
	RUN_TEST(test_background_update_does_nothing_when_on);

	// 6. Fade Tests
	RUN_TEST(test_background_fadeIn_starts_dark);
	RUN_TEST(test_background_fadeIn_brightens);
	RUN_TEST(test_background_fadeIn_transitions_to_on);
	RUN_TEST(test_background_fadeOut_starts_bright);
	RUN_TEST(test_background_fadeOut_dims);
	RUN_TEST(test_background_fadeOut_transitions_to_off);

	// 7. Canvas Coverage Tests
	RUN_TEST(test_background_fills_entire_canvas);
	RUN_TEST(test_background_large_matrix);
	RUN_TEST(test_background_strip_layout);

	// 8. Pixel Digest Tests
	RUN_TEST(test_background_digest_16x16_t100);
	RUN_TEST(test_background_digest_16x16_t200_different_color);
	RUN_TEST(test_background_digest_strip_t150);
	RUN_TEST(test_background_digest_96x8_t100);
	RUN_TEST(test_background_property_static_no_change);
	RUN_TEST(test_background_property_all_configs_render);

	return UNITY_END();
}
