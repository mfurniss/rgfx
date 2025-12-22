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
#include "effects/text_rendering.h"
#include "effects/text_rendering.cpp"
#include "effects/text.h"
#include "effects/text.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

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
	setDefaultTextProps(props);
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
	setDefaultTextProps(props);
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
	setDefaultTextProps(props);
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
	setDefaultTextProps(props);
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
	setDefaultTextProps(props);
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
	setDefaultTextProps(props);
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

void test_text_full_alpha_before_halfway() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["color"] = "#FFFFFF";
	props["duration"] = 1000;  // 1 second

	effect.add(props);

	// At 40% through duration (before halfway), should be full brightness
	effect.update(0.4f);  // 400ms
	canvas.clear();
	effect.render();

	uint32_t brightness = calculateTotalBrightness(canvas);
	TEST_ASSERT_TRUE(brightness > 0);

	// Get a lit pixel - should be full white (255)
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0) {
				TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
				TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
				TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
				return;
			}
		}
	}
	TEST_FAIL_MESSAGE("No lit pixels found");
}

void test_text_fades_after_halfway() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["color"] = "#FFFFFF";
	props["duration"] = 1000;  // 1 second

	effect.add(props);

	// First render at start - get full brightness
	canvas.clear();
	effect.render();
	uint32_t fullBrightness = calculateTotalBrightness(canvas);
	TEST_ASSERT_TRUE(fullBrightness > 0);

	// At 75% through duration (past halfway), should be fading
	effect.update(0.75f);  // 750ms
	canvas.clear();
	effect.render();

	uint32_t fadedBrightness = calculateTotalBrightness(canvas);
	printf("Full brightness: %u, Faded brightness: %u\n", fullBrightness, fadedBrightness);

	// Should be dimmer than full but not zero
	TEST_ASSERT_LESS_THAN(fullBrightness, fadedBrightness);
	TEST_ASSERT_GREATER_THAN(0, fadedBrightness);
}

void test_text_permanent_no_fade() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["color"] = "#FFFFFF";
	props["duration"] = 0;  // Permanent

	effect.add(props);

	// Get initial brightness
	canvas.clear();
	effect.render();
	uint32_t initialBrightness = calculateTotalBrightness(canvas);

	// Update past any reasonable time
	effect.update(100.0f);  // 100 seconds

	canvas.clear();
	effect.render();
	uint32_t laterBrightness = calculateTotalBrightness(canvas);

	// Should be same brightness (no fade for permanent text)
	TEST_ASSERT_EQUAL(initialBrightness, laterBrightness);
}

// =============================================================================
// 3. Position Tests
// =============================================================================

void test_text_position_offset() {
	Matrix matrix(16, 8);  // 64x32 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
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
// 4. Text Wrapping Tests
// =============================================================================

// Helper to check if pixel is lit at a given canvas coordinate
bool isPixelLit(Canvas& canvas, int16_t x, int16_t y) {
	if (x < 0 || y < 0 || x >= canvas.getWidth() || y >= canvas.getHeight()) {
		return false;
	}
	CRGB pixel = canvas.getPixel(x, y);
	return pixel.r > 0 || pixel.g > 0 || pixel.b > 0;
}

// Helper to check if any pixel in a character cell is lit
// charX/charY are in character units (not canvas pixels)
bool isCharCellLit(Canvas& canvas, int charX, int charY) {
	// Each character is CHAR_WIDTH x CHAR_HEIGHT canvas pixels (32x32)
	int16_t startX = charX * CHAR_WIDTH;
	int16_t startY = charY * CHAR_HEIGHT;

	for (int16_t y = startY; y < startY + CHAR_HEIGHT && y < canvas.getHeight(); y++) {
		for (int16_t x = startX; x < startX + CHAR_WIDTH && x < canvas.getWidth(); x++) {
			if (isPixelLit(canvas, x, y)) {
				return true;
			}
		}
	}
	return false;
}

void test_text_no_wrap_when_fits() {
	// 4 characters wide canvas (4 * 32 = 128 canvas pixels)
	// Text "AB" (2 chars) should fit on one row
	Matrix matrix(32, 8);  // 128x32 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "AB";
	props["x"] = 0;
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 128, 64);

	// Both characters should be on row 0
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 0));  // 'A' at char position (0,0)
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 0));  // 'B' at char position (1,0)

	// Row 1 should be empty
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 0, 1));
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 1, 1));
}

void test_text_wraps_to_next_row() {
	// 2 characters wide canvas (2 * 32 = 64 canvas pixels)
	// Text "ABC" (3 chars) should wrap: "AB" on row 0, "C" on row 1
	Matrix matrix(16, 16);  // 64x64 canvas (2 chars wide, 2 chars tall)
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "ABC";
	props["x"] = 0;
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	// Row 0: 'A' and 'B'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 0));  // 'A'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 0));  // 'B'

	// Row 1: 'C' at x=0
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 1));  // 'C'
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 1, 1));  // Empty
}

void test_text_wraps_multiple_rows() {
	// 2 characters wide canvas
	// Text "ABCDEF" (6 chars) should wrap: "AB" row 0, "CD" row 1, "EF" row 2
	Matrix matrix(16, 24);  // 64x96 canvas (2 chars wide, 3 chars tall)
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "ABCDEF";
	props["x"] = 0;
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 96);

	// Row 0: 'A' and 'B'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 0));
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 0));

	// Row 1: 'C' and 'D'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 1));
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 1));

	// Row 2: 'E' and 'F'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 2));
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 2));
}

void test_text_wrap_with_starting_offset() {
	// 2 characters wide canvas (64 canvas pixels)
	// Starting at x=32 means only 1 char fits on first row
	// Text "ABC" should wrap: "A" row 0 at x=32, "BC" row 1 at x=0
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "ABC";
	props["x"] = 32;  // Start at 1 char offset
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	// Row 0: 'A' at x=32 (char position 1)
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 0, 0));  // x=0 empty
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 0));   // 'A' at x=32

	// Row 1: 'B' at x=0, 'C' at x=32 (uses full width)
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 1));   // 'B'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 1));   // 'C'
}

void test_text_wrap_first_row_empty_when_x_exceeds_width() {
	// 2 characters wide canvas (64 canvas pixels)
	// Starting at x=64 means 0 chars fit on first row
	// Text "AB" should wrap: nothing on row 0, "AB" on row 1
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "AB";
	props["x"] = 64;  // Start at canvas edge
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	// Row 0: empty (x=64 leaves no room)
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 0, 0));
	TEST_ASSERT_FALSE(isCharCellLit(canvas, 1, 0));

	// Row 1: 'A' at x=0, 'B' at x=32
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 0, 1));   // 'A'
	TEST_ASSERT_TRUE(isCharCellLit(canvas, 1, 1));   // 'B'
}

void test_text_wrap_preserves_color() {
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "AB";
	props["color"] = "#FF0000";  // Red
	props["x"] = 32;  // Force wrap
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Find any lit pixel and verify it's red
	bool foundRed = false;
	for (uint16_t y = 0; y < canvas.getHeight() && !foundRed; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() && !foundRed; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0) {
				TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
				TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
				TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
				foundRed = true;
			}
		}
	}
	TEST_ASSERT_TRUE(foundRed);
}

void test_text_wrap_with_accent() {
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "AB";
	props["color"] = "#FFFFFF";
	props["accentColor"] = "#0000FF";  // Blue accent
	props["x"] = 32;  // Force wrap
	props["y"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	// Should have both white and blue pixels
	bool foundWhite = false;
	bool foundBlue = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r == 255 && pixel.g == 255 && pixel.b == 255) {
				foundWhite = true;
			}
			if (pixel.b > 0 && pixel.r == 0 && pixel.g == 0) {
				foundBlue = true;
			}
		}
	}
	TEST_ASSERT_TRUE(foundWhite);
	TEST_ASSERT_TRUE(foundBlue);
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
	RUN_TEST(test_text_full_alpha_before_halfway);
	RUN_TEST(test_text_fades_after_halfway);
	RUN_TEST(test_text_permanent_no_fade);
	RUN_TEST(test_text_position_offset);

	// Text wrapping tests
	RUN_TEST(test_text_no_wrap_when_fits);
	RUN_TEST(test_text_wraps_to_next_row);
	RUN_TEST(test_text_wraps_multiple_rows);
	RUN_TEST(test_text_wrap_with_starting_offset);
	RUN_TEST(test_text_wrap_first_row_empty_when_x_exceeds_width);
	RUN_TEST(test_text_wrap_preserves_color);
	RUN_TEST(test_text_wrap_with_accent);

	return UNITY_END();
}
