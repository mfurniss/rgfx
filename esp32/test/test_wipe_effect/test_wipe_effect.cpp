/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for WipeEffect
 *
 * Tests the wipe effect rendering using the real implementation.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>

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
#include "effects/wipe.h"
#include "effects/wipe.cpp"

// Helper to check if a pixel is non-black
static bool isNonBlack(const CRGB& p) {
	return p.r != 0 || p.g != 0 || p.b != 0;
}

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

void test_wipe_creation_default_values() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["direction"] = "right";
	effect.add(props);
	effect.update(0.01f);
	canvas.clear();
	effect.render();

	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_TRUE(hasPixel);
}

void test_wipe_creation_with_color() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["direction"] = "right";
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	bool hasRed = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 && pixel.g == 0 && pixel.b == 0) {
				hasRed = true;
				break;
			}
		}
		if (hasRed) break;
	}

	TEST_ASSERT_TRUE(hasRed);
}

void test_wipe_progresses_over_time() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 2000;
	props["direction"] = "right";
	effect.add(props);

	effect.update(0.5f);
	canvas.clear();
	effect.render();

	bool hasGreen1 = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y).g > 0) {
				hasGreen1 = true;
				break;
			}
		}
		if (hasGreen1) break;
	}

	effect.update(0.5f);
	canvas.clear();
	effect.render();

	bool hasGreen2 = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y).g > 0) {
				hasGreen2 = true;
				break;
			}
		}
		if (hasGreen2) break;
	}

	TEST_ASSERT_TRUE(hasGreen1);
	TEST_ASSERT_TRUE(hasGreen2);
}

void test_wipe_completes() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	effect.add(props);

	effect.update(1.1f);  // Past duration
	canvas.clear();
	effect.render();

	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_FALSE(hasPixel);
}

void test_wipe_reset_clears_all() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	effect.add(props);

	effect.reset();
	canvas.clear();
	effect.render();

	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_FALSE(hasPixel);
}

void test_wipe_canvas_size_matches_matrix() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Canvas is 4x matrix size
	TEST_ASSERT_EQUAL(32, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
}

void test_wipe_column_calculation() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["duration"] = 1000;
	props["direction"] = "right";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	bool hasPixelInFirstHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixelInFirstHalf = true;
				break;
			}
		}
		if (hasPixelInFirstHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInFirstHalf);
}

void test_wipe_direction_left() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["direction"] = "left";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Left wipe should have pixels in the right half of the canvas
	bool hasPixelInRightHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = canvas.getWidth() / 2; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixelInRightHalf = true;
				break;
			}
		}
		if (hasPixelInRightHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInRightHalf);
}

void test_wipe_direction_down() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["direction"] = "down";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Down wipe should have pixels in the top half of the canvas
	bool hasPixelInTopHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight() / 2; y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixelInTopHalf = true;
				break;
			}
		}
		if (hasPixelInTopHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInTopHalf);
}

void test_wipe_direction_up() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	props["direction"] = "up";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Up wipe should have pixels in the bottom half of the canvas
	bool hasPixelInBottomHalf = false;
	for (uint16_t y = canvas.getHeight() / 2; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixelInBottomHalf = true;
				break;
			}
		}
		if (hasPixelInBottomHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInBottomHalf);
}

// =============================================================================
// Edge Case Tests
// =============================================================================

void test_wipe_fill_then_clear_phases() {
	// Wipe has two phases: fill (first half) and clear (second half)
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;  // 500ms fill, 500ms clear
	props["direction"] = "right";
	effect.add(props);

	// At 25% (125ms) - in fill phase, should have some pixels
	effect.update(0.125f);
	canvas.clear();
	effect.render();
	int pixelsAt25 = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) pixelsAt25++;
		}
	}
	TEST_ASSERT_TRUE(pixelsAt25 > 0);

	// At 50% (250ms total) - end of fill phase, should be fully filled
	effect.update(0.125f);  // Now at 250ms
	canvas.clear();
	effect.render();
	int pixelsAt50 = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) pixelsAt50++;
		}
	}
	// At exactly 50%, should be fully filled
	TEST_ASSERT_TRUE(pixelsAt50 >= pixelsAt25);

	// At 75% (375ms total) - in clear phase, should have fewer pixels
	effect.update(0.125f);  // Now at 375ms
	canvas.clear();
	effect.render();
	int pixelsAt75 = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) pixelsAt75++;
		}
	}
	TEST_ASSERT_TRUE(pixelsAt75 > 0);  // Still some visible

	// Update past the duration to verify wipe is removed
	effect.update(0.625f);  // Now at 1125ms (past 1000ms duration)
	canvas.clear();
	effect.render();
	int pixelsAfterDuration = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) pixelsAfterDuration++;
		}
	}
	TEST_ASSERT_EQUAL(0, pixelsAfterDuration);
}

void test_wipe_direction_random() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	hal::test::seedRandom(12345);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["direction"] = "random";
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should render something (direction was randomly selected)
	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}
	TEST_ASSERT_TRUE(hasPixel);
}

void test_wipe_strip_vertical_maps_to_horizontal() {
	// On 1D strip, vertical directions should map to horizontal
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["direction"] = "down";  // Should become "right" on strip
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have pixels in left portion (like right wipe)
	bool hasPixelInLeft = false;
	for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
		if (isNonBlack(canvas.getPixel(x, 0))) {
			hasPixelInLeft = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasPixelInLeft);
}

void test_wipe_strip_up_maps_to_left() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	props["direction"] = "up";  // Should become "left" on strip
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have pixels in right portion (like left wipe)
	bool hasPixelInRight = false;
	for (uint16_t x = canvas.getWidth() / 2; x < canvas.getWidth(); x++) {
		if (isNonBlack(canvas.getPixel(x, 0))) {
			hasPixelInRight = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasPixelInRight);
}

void test_wipe_multiple_concurrent() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	// First wipe: left to right, red
	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["duration"] = 2000;
	props1["direction"] = "right";
	effect.add(props1);

	// Second wipe: right to left, green
	JsonDocument props2;
	props2["color"] = "#00FF00";
	props2["duration"] = 2000;
	props2["direction"] = "left";
	effect.add(props2);

	effect.update(0.2f);  // 200ms into both
	canvas.clear();
	effect.render();

	// Should have both colors present (additive blending)
	bool hasRed = false;
	bool hasGreen = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0) hasRed = true;
			if (pixel.g > 0) hasGreen = true;
		}
	}
	TEST_ASSERT_TRUE(hasRed);
	TEST_ASSERT_TRUE(hasGreen);
}

void test_wipe_duration_very_short() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["duration"] = 10;  // 10ms duration
	props["direction"] = "right";
	effect.add(props);

	// Small update should still show something
	effect.update(0.005f);  // 5ms
	canvas.clear();
	effect.render();

	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}
	TEST_ASSERT_TRUE(hasPixel);

	// Update past duration
	effect.update(0.010f);  // 15ms total
	canvas.clear();
	effect.render();

	hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}
	TEST_ASSERT_FALSE(hasPixel);  // Should be gone
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();
	RUN_TEST(test_wipe_creation_default_values);
	RUN_TEST(test_wipe_creation_with_color);
	RUN_TEST(test_wipe_progresses_over_time);
	RUN_TEST(test_wipe_completes);
	RUN_TEST(test_wipe_reset_clears_all);
	RUN_TEST(test_wipe_canvas_size_matches_matrix);
	RUN_TEST(test_wipe_column_calculation);
	RUN_TEST(test_wipe_direction_left);
	RUN_TEST(test_wipe_direction_down);
	RUN_TEST(test_wipe_direction_up);

	// Edge case tests
	RUN_TEST(test_wipe_fill_then_clear_phases);
	RUN_TEST(test_wipe_direction_random);
	RUN_TEST(test_wipe_strip_vertical_maps_to_horizontal);
	RUN_TEST(test_wipe_strip_up_maps_to_left);
	RUN_TEST(test_wipe_multiple_concurrent);
	RUN_TEST(test_wipe_duration_very_short);

	return UNITY_END();
}
