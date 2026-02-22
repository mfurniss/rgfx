/**
 * Unit Tests for BackgroundEffect
 *
 * Tests singleton background behavior, gradient rendering, and cross-fade.
 * Background now uses gradient-only model - solid colors use single-color gradients.
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
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"

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
	BackgroundEffect effect(canvas);
	TEST_PASS();
}

void test_background_not_rendered_by_default() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Without calling add(), background is black (targetIsBlack=true)
	canvas.clear();
	effect.render();

	// Should render nothing (skipped because targetIsBlack)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_add_renders() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FF0000");  // Red

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should fill entire canvas
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_background_reset_stops_rendering() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FFFFFF");
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
	BackgroundEffect effect(canvas);

	// First color - red
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	effect.add(props1);

	// Second color - green (should replace red immediately with fadeDuration=0)
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#00FF00");
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
	BackgroundEffect effect(canvas);

	// Add multiple times
	for (int i = 0; i < 10; i++) {
		JsonDocument props;
		setDefaultBackgroundProps(props);
		setBackgroundGradientColor(props, "#FFFFFF");
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
// 3. Color Tests (using single-color gradients)
// =============================================================================

void test_background_color_red() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FF0000");
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
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#00FF00");
	effect.add(props);

	canvas.clear();
	effect.render();

	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), greenPixels);
}

void test_background_color_blue() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#0000FF");
	effect.add(props);

	canvas.clear();
	effect.render();

	int bluePixels = countBlueDominantPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), bluePixels);
}

void test_background_color_black_skips_render() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	// Default is black gradient
	effect.add(props);

	canvas.clear();
	effect.render();

	// Black background = no visible pixels (render skipped)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_white() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FFFFFF");
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
// 4. Cross-Fade Tests
// =============================================================================

void test_background_crossfade_immediate_when_zero_duration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set red with fadeDuration=0
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	canvas.clear();
	effect.render();

	// Should be immediately red
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
	TEST_ASSERT_EQUAL(0, pixel.g);
	TEST_ASSERT_EQUAL(0, pixel.b);

	// Now set green with fadeDuration=0
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#00FF00");
	props2["fadeDuration"] = 0;
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Should be immediately green
	pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(0, pixel.r);
	TEST_ASSERT_EQUAL(255, pixel.g);
	TEST_ASSERT_EQUAL(0, pixel.b);
}

void test_background_crossfade_interpolates() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set red with fadeDuration=0 (immediate)
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	// Now set green with fadeDuration=1000 (1 second fade)
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#00FF00");
	props2["fadeDuration"] = 1000;
	effect.add(props2);

	// At t=0, should still be red
	canvas.clear();
	effect.render();
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(255, pixel.r);
	TEST_ASSERT_EQUAL(0, pixel.g);

	// Advance halfway
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	pixel = canvas.getPixel(0, 0);

	// Should be roughly half red, half green
	TEST_ASSERT_TRUE(pixel.r > 100 && pixel.r < 150);
	TEST_ASSERT_TRUE(pixel.g > 100 && pixel.g < 150);
}

void test_background_crossfade_completes() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set red immediately
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	// Set green with 1 second fade
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#00FF00");
	props2["fadeDuration"] = 1000;
	effect.add(props2);

	// Advance past fade duration
	effect.update(1.5f);
	canvas.clear();
	effect.render();

	// Should be fully green
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL(0, pixel.r);
	TEST_ASSERT_EQUAL(255, pixel.g);
	TEST_ASSERT_EQUAL(0, pixel.b);
}

void test_background_crossfade_mid_fade_new_gradient() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set red immediately
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	// Start fading to green
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#00FF00");
	props2["fadeDuration"] = 1000;
	effect.add(props2);

	// Advance halfway (should be yellow-ish)
	effect.update(0.5f);

	// Now start fading to blue
	JsonDocument props3;
	setDefaultBackgroundProps(props3);
	setBackgroundGradientColor(props3, "#0000FF");
	props3["fadeDuration"] = 1000;
	effect.add(props3);

	// At t=0 of new fade, should be the snapshotted yellow-ish color
	canvas.clear();
	effect.render();
	CRGB pixel = canvas.getPixel(0, 0);

	// Should have some red and green from the snapshot
	TEST_ASSERT_TRUE(pixel.r > 100);
	TEST_ASSERT_TRUE(pixel.g > 100);
	TEST_ASSERT_EQUAL(0, pixel.b);

	// Complete the fade to blue
	effect.update(1.0f);
	canvas.clear();
	effect.render();
	pixel = canvas.getPixel(0, 0);

	// Should be fully blue
	TEST_ASSERT_EQUAL(0, pixel.r);
	TEST_ASSERT_EQUAL(0, pixel.g);
	TEST_ASSERT_EQUAL(255, pixel.b);
}

// =============================================================================
// 5. Black/Off Detection Tests
// =============================================================================

void test_background_black_gradient_skips_render() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set a color first
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Now set black
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#000000");
	props2["fadeDuration"] = 0;
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Should skip render (all black)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_fade_to_black() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set white
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FFFFFF");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	// Fade to black
	JsonDocument props2;
	setDefaultBackgroundProps(props2);
	setBackgroundGradientColor(props2, "#000000");
	props2["fadeDuration"] = 1000;
	effect.add(props2);

	// Halfway through fade - should have some brightness
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Complete fade - should skip render
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_empty_array_is_black() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set a color first
	JsonDocument props1;
	setDefaultBackgroundProps(props1);
	setBackgroundGradientColor(props1, "#FF0000");
	props1["fadeDuration"] = 0;
	effect.add(props1);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Send empty gradient (should be treated as black)
	JsonDocument props2;
	JsonObject gradient = props2["gradient"].to<JsonObject>();
	gradient["colors"].to<JsonArray>();  // Empty array
	gradient["orientation"] = "horizontal";
	props2["fadeDuration"] = 0;
	effect.add(props2);

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_background_all_black_colors_is_black() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	// Set gradient with multiple black colors
	JsonDocument props;
	JsonObject gradient = props["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#000000");
	colors.add("#000000");
	colors.add("#000000");
	gradient["orientation"] = "horizontal";
	props["fadeDuration"] = 0;
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should skip render (all black)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 6. Canvas Coverage Tests
// =============================================================================

void test_background_fills_entire_canvas() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#808080");  // Gray
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
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#123456");
	effect.add(props);

	canvas.clear();
	effect.render();

	// All canvas pixels should be filled
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_background_strip_layout() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FF00FF");  // Magenta
	effect.add(props);

	canvas.clear();
	effect.render();

	// Strip should be fully filled
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth(), pixelCount);
}

// =============================================================================
// 7. Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runBackgroundDigest(const TestConfig& config, float updateTime,
                                     const char* color = "#00FFFF") {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, color);
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_background_digest_16x16_t100() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[1], 0.1f);
	// Verify we get consistent output
	TEST_ASSERT_TRUE(digest != 0);
}

void test_background_digest_16x16_t200_different_color() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[1], 0.2f, "#FF00FF");
	TEST_ASSERT_TRUE(digest != 0);
}

void test_background_digest_strip_t150() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[0], 0.15f);
	TEST_ASSERT_TRUE(digest != 0);
}

void test_background_digest_96x8_t100() {
	uint64_t digest = runBackgroundDigest(TEST_CONFIGS[2], 0.1f);
	TEST_ASSERT_TRUE(digest != 0);
}

void test_background_property_static_no_change() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	BackgroundEffect effect(canvas);

	JsonDocument props;
	setDefaultBackgroundProps(props);
	setBackgroundGradientColor(props, "#FFFFFF");
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
		BackgroundEffect effect(canvas);

		JsonDocument props;
		setDefaultBackgroundProps(props);
		setBackgroundGradientColor(props, "#808080");
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
	RUN_TEST(test_background_not_rendered_by_default);
	RUN_TEST(test_background_add_renders);
	RUN_TEST(test_background_reset_stops_rendering);

	// 2. Singleton Behavior Tests
	RUN_TEST(test_background_singleton_replaces_previous);
	RUN_TEST(test_background_multiple_add_calls);

	// 3. Color Tests
	RUN_TEST(test_background_color_red);
	RUN_TEST(test_background_color_green);
	RUN_TEST(test_background_color_blue);
	RUN_TEST(test_background_color_black_skips_render);
	RUN_TEST(test_background_white);

	// 4. Cross-Fade Tests
	RUN_TEST(test_background_crossfade_immediate_when_zero_duration);
	RUN_TEST(test_background_crossfade_interpolates);
	RUN_TEST(test_background_crossfade_completes);
	RUN_TEST(test_background_crossfade_mid_fade_new_gradient);

	// 5. Black/Off Detection Tests
	RUN_TEST(test_background_black_gradient_skips_render);
	RUN_TEST(test_background_fade_to_black);
	RUN_TEST(test_background_empty_array_is_black);
	RUN_TEST(test_background_all_black_colors_is_black);

	// 6. Canvas Coverage Tests
	RUN_TEST(test_background_fills_entire_canvas);
	RUN_TEST(test_background_large_matrix);
	RUN_TEST(test_background_strip_layout);

	// 7. Pixel Digest Tests
	RUN_TEST(test_background_digest_16x16_t100);
	RUN_TEST(test_background_digest_16x16_t200_different_color);
	RUN_TEST(test_background_digest_strip_t150);
	RUN_TEST(test_background_digest_96x8_t100);
	RUN_TEST(test_background_property_static_no_change);
	RUN_TEST(test_background_property_all_configs_render);

	return UNITY_END();
}
