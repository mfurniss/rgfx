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
	return UNITY_END();
}
