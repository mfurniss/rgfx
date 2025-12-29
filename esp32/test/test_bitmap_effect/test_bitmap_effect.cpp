/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for BitmapEffect
 *
 * Tests bitmap rendering, positioning, transparency, and layering.
 * Bitmaps use a 16-color palette (indices 0-F) where:
 * - ' ' or '.' = transparent pixel
 * - '0'-'9' = palette indices 0-9
 * - 'A'-'F' (case insensitive) = palette indices 10-15
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
#include "utils/easing.h"
#include "utils/easing_impl.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/bitmap.h"
#include "effects/bitmap.cpp"

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

void test_bitmap_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_bitmap_add_simple_image() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("88");  // Red pixels (palette index 8)
	image.add("88");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have rendered the 2x2 bitmap (scaled 4x = 8x8 pixels)
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_bitmap_reset_clears_all() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 5000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("777");  // White pixels (palette index 7)
	image.add("777");

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
// 2. Positioning Tests
// =============================================================================

void test_bitmap_center_position() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("77");
	image.add("77");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Bitmap should be centered
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);

	// Center should be approximately in middle of canvas
	int centerX = (box.minX + box.maxX) / 2;
	int centerY = (box.minY + box.maxY) / 2;
	TEST_ASSERT_INT_WITHIN(4, canvas.getWidth() / 2, centerX);
	TEST_ASSERT_INT_WITHIN(4, canvas.getHeight() / 2, centerY);
}

void test_bitmap_position_top_left() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;
	props["centerY"] = 0;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("77");
	image.add("77");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Bitmap centered at 0,0 means only partial visible (bottom-right of bitmap)
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Should be in top-left quadrant
	TEST_ASSERT_TRUE(countPixelsInQuadrant(canvas, 0) > 0);
}

void test_bitmap_position_bottom_right() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 100;
	props["centerY"] = 100;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("77");
	image.add("77");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should be in bottom-right quadrant
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_TRUE(countPixelsInQuadrant(canvas, 3) > 0);
}

void test_bitmap_position_arbitrary() {
	// Hub resolves "random" to numeric values before sending - ESP32 requires numeric
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 25;  // Hub-resolved random value
	props["centerY"] = 75;  // Hub-resolved random value
	JsonArray image = props["image"].to<JsonArray>();
	image.add("777");
	image.add("777");

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_bitmap_off_canvas_not_rendered() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = -100;  // Far off-canvas
	props["centerY"] = -100;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should be completely off-canvas
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 3. Transparency Tests
// =============================================================================

void test_bitmap_spaces_are_transparent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7 7");  // Space in middle
	image.add("   ");  // All spaces
	image.add("7 7");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should only render corner pixels, not spaces
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
	TEST_ASSERT_TRUE(pixelCount < 150);  // Not full image
}

void test_bitmap_period_transparent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("8.8");  // Red, transparent, red
	image.add("...");  // All transparent
	image.add("8.8");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have 4 red pixels (corners), not 9
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
	TEST_ASSERT_TRUE(redPixels < 100);
}

void test_bitmap_alpha_blending() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Pre-fill canvas with red
	canvas.fill(CRGB(100, 0, 0));

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("B");  // Green from palette (index B)

	effect.add(props);
	effect.render();  // Don't clear - blend on top

	// Should have blended pixels
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// 4. Duration & Expiration Tests
// =============================================================================

void test_bitmap_expires_after_duration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 100;  // 100ms
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("77");
	image.add("77");

	effect.add(props);

	// Initially visible
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
// 5. Multiple Bitmaps Tests
// =============================================================================

void test_bitmap_multiple_concurrent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// First bitmap (red, left side)
	JsonDocument props1;
	addPico8Palette(props1);
	props1["duration"] = 5000;
	props1["centerX"] = 25;
	props1["centerY"] = 50;
	JsonArray image1 = props1["image"].to<JsonArray>();
	image1.add("8");  // Red (palette index 8)
	effect.add(props1);

	// Second bitmap (green, right side)
	JsonDocument props2;
	addPico8Palette(props2);
	props2["duration"] = 5000;
	props2["centerX"] = 75;
	props2["centerY"] = 50;
	JsonArray image2 = props2["image"].to<JsonArray>();
	image2.add("B");  // Green (palette index B)
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Should have both red and green pixels
	int redPixels = countRedDominantPixels(canvas);
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

// =============================================================================
// 6. Image Parsing Tests
// =============================================================================

void test_bitmap_empty_image() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	// No image array

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should render nothing (no crash)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_single_pixel() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");  // Single white pixel

	effect.add(props);
	canvas.clear();
	effect.render();

	// Single pixel scaled 4x = 4x4 block
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
	TEST_ASSERT_TRUE(pixelCount <= 16);
}

void test_bitmap_varying_row_lengths() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");      // 1 char
	image.add("777");    // 3 chars
	image.add("77");     // 2 chars

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should handle varying row lengths
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 7. Palette Tests
// =============================================================================

void test_bitmap_palette_index_0_black() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("00");  // Use palette index 0 (black)
	image.add("00");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Palette index 0 is black (#000000), so pixels should be black
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_palette_index_8_red() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("88");  // Use palette index 8 (PICO-8 red: #FF004D)
	image.add("88");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have red-dominant pixels
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
}

void test_bitmap_palette_index_B_green() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("BB");  // Use palette index B (PICO-8 green: #00E436)
	image.add("BB");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have green-dominant pixels
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

void test_bitmap_palette_index_C_blue() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("CC");  // Use palette index C (PICO-8 blue: #29ADFF)
	image.add("CC");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have blue-dominant pixels
	int bluePixels = countBlueDominantPixels(canvas);
	TEST_ASSERT_TRUE(bluePixels > 0);
}

void test_bitmap_palette_lowercase() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("bb");  // lowercase should work same as BB
	image.add("bb");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have green-dominant pixels (same as uppercase)
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

void test_bitmap_custom_palette() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	// Custom 2-color palette
	JsonArray palette = props["palette"].to<JsonArray>();
	palette.add("#00FF00");  // 0: Green
	palette.add("#FF0000");  // 1: Red
	JsonArray image = props["image"].to<JsonArray>();
	image.add("01");
	image.add("10");

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have both green and red pixels
	int greenPixels = countGreenDominantPixels(canvas);
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_TRUE(greenPixels > 0);
	TEST_ASSERT_TRUE(redPixels > 0);
}

void test_bitmap_invalid_palette_index_transparent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	// Only 2 colors in palette
	JsonArray palette = props["palette"].to<JsonArray>();
	palette.add("#FF0000");  // 0: Red
	palette.add("#00FF00");  // 1: Green
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("0F");  // 0 valid, F invalid (out of range)

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should only render valid palette index (red)
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
	// Invalid index F should be transparent (no additional pixels)
}

// =============================================================================
// 8. Movement Animation Tests
// =============================================================================

void test_bitmap_movement_start_position() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;    // Start at left
	props["centerY"] = 50;
	props["endX"] = 100;     // End at right
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");  // Single white pixel

	effect.add(props);
	canvas.clear();
	effect.render();  // At t=0, should be at start position

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Should be on the left side of canvas
	TEST_ASSERT_TRUE(box.maxX < canvas.getWidth() / 2);
}

void test_bitmap_movement_end_position() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;    // Start at left
	props["centerY"] = 50;
	props["endX"] = 100;     // End at right
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);

	// Update to near end of duration
	effect.update(0.99f);  // 990ms of 1000ms

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Should be on the right side of canvas
	TEST_ASSERT_TRUE(box.minX >= canvas.getWidth() / 2);
}

void test_bitmap_movement_midpoint() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;    // Start at left
	props["centerY"] = 50;
	props["endX"] = 100;     // End at right
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);

	// Update to halfway
	effect.update(0.5f);  // 500ms of 1000ms

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Should be approximately centered
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(8, canvas.getWidth() / 2, centerX);
}

void test_bitmap_movement_only_endX() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;
	props["centerY"] = 50;
	props["endX"] = 100;  // Only endX, no endY
	props["easing"] = "linear";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should have moved horizontally but stayed at same Y
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	int centerY = (box.minY + box.maxY) / 2;
	TEST_ASSERT_INT_WITHIN(4, canvas.getHeight() / 2, centerY);
}

void test_bitmap_movement_only_endY() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 0;
	props["endY"] = 100;  // Only endY, no endX
	props["easing"] = "linear";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should have moved vertically but stayed at same X
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(4, canvas.getWidth() / 2, centerX);
}

void test_bitmap_no_movement_without_end_coords() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	// No endX/endY - should stay stationary
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);

	// Capture initial position
	canvas.clear();
	effect.render();
	BoundingBox box1 = findBoundingBox(canvas);

	// Update halfway
	effect.update(0.5f);

	canvas.clear();
	effect.render();
	BoundingBox box2 = findBoundingBox(canvas);

	// Position should be the same
	TEST_ASSERT_EQUAL(box1.minX, box2.minX);
	TEST_ASSERT_EQUAL(box1.minY, box2.minY);
}

void test_bitmap_easing_quadraticOut() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;
	props["centerY"] = 50;
	props["endX"] = 100;
	props["endY"] = 50;
	props["easing"] = "quadraticOut";
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);
	effect.update(0.5f);  // 50% time

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// With quadraticOut at 50% time, should be past 50% distance
	// (easeOut starts fast, slows down)
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_TRUE(centerX > canvas.getWidth() / 2);
}

void test_bitmap_easing_default_linear() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 0;
	props["centerY"] = 50;
	props["endX"] = 100;
	props["endY"] = 50;
	// No easing specified - should default to linear
	JsonArray image = props["image"].to<JsonArray>();
	image.add("7");

	effect.add(props);
	effect.update(0.5f);  // 50% time

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// With linear at 50% time, should be at 50% distance
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(8, canvas.getWidth() / 2, centerX);
}

// =============================================================================
// 9. LED Quantization Tests
// =============================================================================

void test_bitmap_random_x_snapped_to_led() {
	// Random X positions should always be snapped to LED boundaries (multiples of 4)
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Test multiple random seeds to verify snapping works
	for (int seed = 0; seed < 10; seed++) {
		hal::test::seedRandom(seed * 1000);
		BitmapEffect effect(matrix, canvas);

		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 1000;
		props["centerX"] = "random";
		props["centerY"] = 50;  // Fixed Y
		JsonArray image = props["image"].to<JsonArray>();
		image.add("7");  // Single pixel

		effect.add(props);
		canvas.clear();
		effect.render();

		BoundingBox box = findBoundingBox(canvas);
		if (box.valid) {
			// minX should be a multiple of 4 (LED boundary)
			TEST_ASSERT_EQUAL_MESSAGE(0, box.minX % 4, "X position not snapped to LED boundary");
		}
	}
}

void test_bitmap_random_y_snapped_to_led() {
	// Random Y positions should always be snapped to LED boundaries (multiples of 4)
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Test multiple random seeds to verify snapping works
	for (int seed = 0; seed < 10; seed++) {
		hal::test::seedRandom(seed * 1000);
		BitmapEffect effect(matrix, canvas);

		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 1000;
		props["centerX"] = 50;  // Fixed X
		props["centerY"] = "random";
		JsonArray image = props["image"].to<JsonArray>();
		image.add("7");  // Single pixel

		effect.add(props);
		canvas.clear();
		effect.render();

		BoundingBox box = findBoundingBox(canvas);
		if (box.valid) {
			// minY should be a multiple of 4 (LED boundary)
			TEST_ASSERT_EQUAL_MESSAGE(0, box.minY % 4, "Y position not snapped to LED boundary");
		}
	}
}

void test_bitmap_both_random_snapped_to_led() {
	// Both random X and Y should be snapped to LED boundaries
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	for (int seed = 0; seed < 10; seed++) {
		hal::test::seedRandom(seed * 1000);
		BitmapEffect effect(matrix, canvas);

		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 1000;
		props["centerX"] = "random";
		props["centerY"] = "random";
		JsonArray image = props["image"].to<JsonArray>();
		image.add("7");

		effect.add(props);
		canvas.clear();
		effect.render();

		BoundingBox box = findBoundingBox(canvas);
		if (box.valid) {
			TEST_ASSERT_EQUAL_MESSAGE(0, box.minX % 4, "X position not snapped to LED boundary");
			TEST_ASSERT_EQUAL_MESSAGE(0, box.minY % 4, "Y position not snapped to LED boundary");
		}
	}
}

// =============================================================================
// 10. Strip Layout Tests
// =============================================================================

void test_bitmap_on_strip() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray image = props["image"].to<JsonArray>();
	image.add("777");

	// Should not crash
	effect.add(props);
	canvas.clear();
	effect.render();

	// Verify strip canvas dimensions are correct
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	TEST_ASSERT_EQUAL(64, canvas.getWidth());
	TEST_PASS();
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// 1. Basic Creation & Defaults
	RUN_TEST(test_bitmap_creation);
	RUN_TEST(test_bitmap_add_simple_image);
	RUN_TEST(test_bitmap_reset_clears_all);

	// 2. Positioning Tests
	RUN_TEST(test_bitmap_center_position);
	RUN_TEST(test_bitmap_position_top_left);
	RUN_TEST(test_bitmap_position_bottom_right);
	RUN_TEST(test_bitmap_position_arbitrary);
	RUN_TEST(test_bitmap_off_canvas_not_rendered);

	// 3. Transparency Tests
	RUN_TEST(test_bitmap_spaces_are_transparent);
	RUN_TEST(test_bitmap_period_transparent);
	RUN_TEST(test_bitmap_alpha_blending);

	// 4. Duration & Expiration Tests
	RUN_TEST(test_bitmap_expires_after_duration);

	// 5. Multiple Bitmaps Tests
	RUN_TEST(test_bitmap_multiple_concurrent);

	// 6. Image Parsing Tests
	RUN_TEST(test_bitmap_empty_image);
	RUN_TEST(test_bitmap_single_pixel);
	RUN_TEST(test_bitmap_varying_row_lengths);

	// 7. Palette Tests
	RUN_TEST(test_bitmap_palette_index_0_black);
	RUN_TEST(test_bitmap_palette_index_8_red);
	RUN_TEST(test_bitmap_palette_index_B_green);
	RUN_TEST(test_bitmap_palette_index_C_blue);
	RUN_TEST(test_bitmap_palette_lowercase);
	RUN_TEST(test_bitmap_custom_palette);
	RUN_TEST(test_bitmap_invalid_palette_index_transparent);

	// 8. Movement Animation Tests
	RUN_TEST(test_bitmap_movement_start_position);
	RUN_TEST(test_bitmap_movement_end_position);
	RUN_TEST(test_bitmap_movement_midpoint);
	RUN_TEST(test_bitmap_movement_only_endX);
	RUN_TEST(test_bitmap_movement_only_endY);
	RUN_TEST(test_bitmap_no_movement_without_end_coords);
	RUN_TEST(test_bitmap_easing_quadraticOut);
	RUN_TEST(test_bitmap_easing_default_linear);

	// 9. LED Quantization Tests
	RUN_TEST(test_bitmap_random_x_snapped_to_led);
	RUN_TEST(test_bitmap_random_y_snapped_to_led);
	RUN_TEST(test_bitmap_both_random_snapped_to_led);

	// 10. Strip Layout Tests
	RUN_TEST(test_bitmap_on_strip);

	return UNITY_END();
}
