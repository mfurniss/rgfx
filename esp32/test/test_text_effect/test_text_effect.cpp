/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for TextEffect
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

// Include fonts
#include "fonts/den_8x8.h"
#include "fonts/den_8x8.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/text.h"
#include "effects/text.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// Helper to visualize canvas for debugging
// =============================================================================

void printCanvas(Canvas& canvas, int maxWidth = 32, int maxHeight = 16) {
	printf("\nCanvas (%dx%d):\n", canvas.getWidth(), canvas.getHeight());
	int w = std::min((int)canvas.getWidth(), maxWidth);
	int h = std::min((int)canvas.getHeight(), maxHeight);

	for (int y = 0; y < h; y++) {
		printf("Row %2d: ", y);
		for (int x = 0; x < w; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
				printf("#");
			} else {
				printf(".");
			}
		}
		printf("\n");
	}
}

// =============================================================================
// 1. Basic Creation & Defaults
// =============================================================================

void test_text_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_text_render_single_char() {
	// Each char is 8x7 font pixels, scaled 4x = 32x28 canvas pixels
	// Need at least 8x7 matrix for one character
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "H";
	props["color"] = "#FFFFFF";
	props["x"] = 0;
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas);

	// 'H' should have pixels (each font pixel is now a 4x4 block)
	int pixelCount = countNonBlackPixels(canvas);
	printf("Pixel count: %d\n", pixelCount);
	TEST_ASSERT_TRUE(pixelCount > 0);

	// Check corners of a 4x4 block - row 0, col 0-3 should all be lit (first font pixel)
	CRGB row0_col0 = canvas.getPixel(0, 0);
	CRGB row0_col3 = canvas.getPixel(3, 0);
	printf("Row 0, col 0: r=%d g=%d b=%d\n", row0_col0.r, row0_col0.g, row0_col0.b);
	printf("Row 0, col 3: r=%d g=%d b=%d (same 4x4 block)\n", row0_col3.r, row0_col3.g, row0_col3.b);

	// Both should be white (part of same 4x4 block for first font pixel)
	TEST_ASSERT_TRUE(row0_col0.r > 0 || row0_col0.g > 0 || row0_col0.b > 0);

	// Middle gap of H starts at canvas col 8 (font col 2 * 4)
	CRGB gap = canvas.getPixel(8, 0);
	printf("Row 0, col 8 (gap): r=%d g=%d b=%d (should be black)\n", gap.r, gap.g, gap.b);
	TEST_ASSERT_EQUAL(0, gap.r);
	TEST_ASSERT_EQUAL(0, gap.g);
	TEST_ASSERT_EQUAL(0, gap.b);
}

void test_text_render_hello() {
	// "HELLO" = 5 chars × 32 canvas pixels = 160 wide, 28 tall
	// Need 40x7 matrix (160x28 canvas)
	Matrix matrix(40, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "HELLO";
	props["color"] = "#FFFFFF";
	props["x"] = 0;
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 160, 28);

	// Should have pixels
	int pixelCount = countNonBlackPixels(canvas);
	printf("Pixel count for HELLO: %d\n", pixelCount);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_text_default_color_white() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "X";
	// No color - should default to white

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have white pixels
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_text_reset_clears() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "X";
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
// 2. Duration Tests
// =============================================================================

void test_text_duration_zero_is_permanent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "X";
	props["duration"] = 0;  // Permanent

	effect.add(props);

	// Update past any reasonable time
	effect.update(100.0f);  // 100 seconds

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_text_expires_after_duration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "X";
	props["duration"] = 100;  // 100ms

	effect.add(props);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Update past duration
	effect.update(0.2f);  // 200ms

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 3. Position Tests
// =============================================================================

void test_text_position_offset() {
	Matrix matrix(16, 8);  // 64x32 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	props["text"] = "X";
	props["x"] = 8;
	props["y"] = 4;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 32, 16);

	// Pixel at (8, 4) should be set (X has pixels in first row)
	// Actually check bounding box
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_EQUAL(8, box.minX);
	TEST_ASSERT_EQUAL(4, box.minY);
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	RUN_TEST(test_text_creation);
	RUN_TEST(test_text_render_single_char);
	RUN_TEST(test_text_render_hello);
	RUN_TEST(test_text_default_color_white);
	RUN_TEST(test_text_reset_clears);
	RUN_TEST(test_text_duration_zero_is_permanent);
	RUN_TEST(test_text_expires_after_duration);
	RUN_TEST(test_text_position_offset);

	return UNITY_END();
}
