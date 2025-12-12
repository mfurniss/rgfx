/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for TestLedsEffect
 *
 * Tests the test LED pattern rendering using the real implementation.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>

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

// Include effects
#include "effects/effect.h"
#include "effects/test_leds.h"
#include "effects/test_leds.cpp"

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

void test_single_panel_has_white_marker_at_origin() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

void test_strip_layout_has_white_marker_at_start() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

void test_matrix_quadrants_correct_colors() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();

	// Canvas is 4x matrix size = 32x32
	// Top-left quadrant should be red (but (0,0) is white marker)
	CRGB tl = canvas.getPixel(4, 4);
	TEST_ASSERT_EQUAL_UINT8(255, tl.r);
	TEST_ASSERT_EQUAL_UINT8(0, tl.g);
	TEST_ASSERT_EQUAL_UINT8(0, tl.b);

	// Top-right quadrant should be green
	CRGB tr = canvas.getPixel(20, 4);
	TEST_ASSERT_EQUAL_UINT8(0, tr.r);
	TEST_ASSERT_EQUAL_UINT8(255, tr.g);
	TEST_ASSERT_EQUAL_UINT8(0, tr.b);

	// Bottom-left quadrant should be blue
	CRGB bl = canvas.getPixel(4, 20);
	TEST_ASSERT_EQUAL_UINT8(0, bl.r);
	TEST_ASSERT_EQUAL_UINT8(0, bl.g);
	TEST_ASSERT_EQUAL_UINT8(255, bl.b);

	// Bottom-right quadrant should be yellow
	CRGB br = canvas.getPixel(20, 20);
	TEST_ASSERT_EQUAL_UINT8(255, br.r);
	TEST_ASSERT_EQUAL_UINT8(255, br.g);
	TEST_ASSERT_EQUAL_UINT8(0, br.b);
}

void test_strip_segments_correct_colors() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();

	// Canvas is 4x matrix width = 64 pixels wide, height = 1 (strip)
	// Segment 0: Red (but (0,0) is white)
	CRGB s0 = canvas.getPixel(4, 0);
	TEST_ASSERT_EQUAL_UINT8(255, s0.r);
	TEST_ASSERT_EQUAL_UINT8(0, s0.g);
	TEST_ASSERT_EQUAL_UINT8(0, s0.b);

	// Segment 1: Green
	CRGB s1 = canvas.getPixel(20, 0);
	TEST_ASSERT_EQUAL_UINT8(0, s1.r);
	TEST_ASSERT_EQUAL_UINT8(255, s1.g);
	TEST_ASSERT_EQUAL_UINT8(0, s1.b);

	// Segment 2: Blue
	CRGB s2 = canvas.getPixel(36, 0);
	TEST_ASSERT_EQUAL_UINT8(0, s2.r);
	TEST_ASSERT_EQUAL_UINT8(0, s2.g);
	TEST_ASSERT_EQUAL_UINT8(255, s2.b);

	// Segment 3: Yellow
	CRGB s3 = canvas.getPixel(52, 0);
	TEST_ASSERT_EQUAL_UINT8(255, s3.r);
	TEST_ASSERT_EQUAL_UINT8(255, s3.g);
	TEST_ASSERT_EQUAL_UINT8(0, s3.b);
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();
	RUN_TEST(test_single_panel_has_white_marker_at_origin);
	RUN_TEST(test_strip_layout_has_white_marker_at_start);
	RUN_TEST(test_matrix_quadrants_correct_colors);
	RUN_TEST(test_strip_segments_correct_colors);
	return UNITY_END();
}
