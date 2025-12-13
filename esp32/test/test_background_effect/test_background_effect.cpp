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
// 4. Enable/Disable Tests
// =============================================================================

void test_background_enabled_flag_true() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["enabled"] = true;
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_background_enabled_flag_false() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	// First enable
	JsonDocument props1;
	props1["color"] = "#FF0000";
	effect.add(props1);

	// Then disable
	JsonDocument props2;
	props2["enabled"] = false;
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Background disabled - no pixels
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
	props2["enabled"] = false;
	effect.add(props2);

	// Re-enable with new color
	JsonDocument props3;
	props3["color"] = "#00FF00";
	props3["enabled"] = true;
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

void test_background_update_does_nothing() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	effect.add(props);

	// Update should not affect background
	effect.update(1.0f);
	effect.update(10.0f);

	canvas.clear();
	effect.render();

	// Should still render
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 6. Canvas Coverage Tests
// =============================================================================

void test_background_fills_entire_canvas() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BackgroundEffect effect(matrix, canvas);

	JsonDocument props;
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
	RUN_TEST(test_background_enabled_flag_true);
	RUN_TEST(test_background_enabled_flag_false);
	RUN_TEST(test_background_re_enable_after_disable);

	// 5. Update Behavior Tests
	RUN_TEST(test_background_update_does_nothing);

	// 6. Canvas Coverage Tests
	RUN_TEST(test_background_fills_entire_canvas);
	RUN_TEST(test_background_large_matrix);
	RUN_TEST(test_background_strip_layout);

	return UNITY_END();
}
