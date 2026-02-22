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
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	frame.add("88");  // Red pixels (palette index 8)
	frame.add("88");

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
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	frame.add("777");  // White pixels (palette index 7)
	frame.add("777");

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
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	frame.add("77");
	frame.add("77");

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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images1 = props1["images"].to<JsonArray>(); JsonArray image1 = images1.add<JsonArray>();
	image1.add("8");  // Red (palette index 8)
	effect.add(props1);

	// Second bitmap (green, right side)
	JsonDocument props2;
	addPico8Palette(props2);
	props2["duration"] = 5000;
	props2["centerX"] = 75;
	props2["centerY"] = 50;
	JsonArray images2 = props2["images"].to<JsonArray>(); JsonArray image2 = images2.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	props["fadeIn"] = 0;
	props["fadeOut"] = 0;
	// Custom 2-color palette
	JsonArray palette = props["palette"].to<JsonArray>();
	palette.add("#00FF00");  // 0: Green
	palette.add("#FF0000");  // 1: Red
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	props["fadeIn"] = 0;
	props["fadeOut"] = 0;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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

void test_bitmap_easing_default_quadraticInOut() {
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
	// No easing specified - should default to quadraticInOut
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	effect.add(props);
	effect.update(0.5f);  // 50% time

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// quadraticInOut at 50% gives exactly 50% distance (symmetric around midpoint)
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(8, canvas.getWidth() / 2, centerX);
}

void test_bitmap_movement_from_off_canvas_left() {
	// Bitmap starts off-canvas (negative X) and moves onto canvas
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = -20;   // Start off-canvas left
	props["centerY"] = 50;
	props["endX"] = 50;       // End in center
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	effect.add(props);

	// At t=0, bitmap should be off-canvas (not visible)
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// At t=100%, bitmap should be visible at center
	effect.update(0.99f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	int centerX = (box.minX + box.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(8, canvas.getWidth() / 2, centerX);
}

void test_bitmap_movement_to_off_canvas_right() {
	// Bitmap starts on-canvas and moves off-canvas (>100% X)
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;    // Start in center
	props["centerY"] = 50;
	props["endX"] = 120;      // End off-canvas right
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	effect.add(props);

	// At t=0, bitmap should be visible at center
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// At t=100%, bitmap should be off-canvas (not visible)
	effect.update(0.99f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_movement_off_canvas_both_ends() {
	// Bitmap travels completely across canvas: off-left -> off-right
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = -20;   // Start off-canvas left
	props["centerY"] = 50;
	props["endX"] = 120;      // End off-canvas right
	props["endY"] = 50;
	props["easing"] = "linear";
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	effect.add(props);

	// At t=0, off-canvas left
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// At t=50%, should be visible in center
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// At t=100%, off-canvas right
	effect.update(0.49f);  // Additional 490ms to reach 990ms total
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_movement_off_canvas_vertical() {
	// Bitmap moves from off-canvas top to off-canvas bottom
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = -20;   // Start off-canvas top
	props["endX"] = 50;
	props["endY"] = 120;      // End off-canvas bottom
	props["easing"] = "linear";
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	effect.add(props);

	// At t=0, off-canvas top
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// At t=50%, should be visible in center
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_bitmap_negative_percentage_accepted() {
	// Verify that negative percentages are accepted (not rejected as "missing")
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = -10;   // Negative should be accepted
	props["centerY"] = -10;   // Negative should be accepted
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
	image.add("7");

	// Should not log error or fail - negative values are valid for off-canvas
	effect.add(props);

	// Move to center over time
	props["endX"] = 50;
	props["endY"] = 50;

	// Effect was added successfully if we got here without crash/error
	TEST_PASS();
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
		JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
		JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
		JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
	JsonArray images = props["images"].to<JsonArray>(); JsonArray image = images.add<JsonArray>();
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
// 11. Animation Frame Tests
// =============================================================================

void test_bitmap_single_frame_animation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["frameRate"] = 2;
	addSingleFrameImage(props, {"88", "88"});

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_bitmap_two_frame_animation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 2000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["frameRate"] = 2;  // 500ms per frame
	addMultiFrameImages(props, {{"88", "88"}, {"BB", "BB"}});

	effect.add(props);

	// At t=0, should show frame 0 (red)
	canvas.clear();
	effect.render();
	int redPixels1 = countRedDominantPixels(canvas);
	int greenPixels1 = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels1 > 0);
	TEST_ASSERT_EQUAL(0, greenPixels1);

	// At t=500ms, should show frame 1 (green)
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	int redPixels2 = countRedDominantPixels(canvas);
	int greenPixels2 = countGreenDominantPixels(canvas);
	TEST_ASSERT_EQUAL(0, redPixels2);
	TEST_ASSERT_TRUE(greenPixels2 > 0);

	// At t=1000ms, should cycle back to frame 0 (red)
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	int redPixels3 = countRedDominantPixels(canvas);
	int greenPixels3 = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels3 > 0);
	TEST_ASSERT_EQUAL(0, greenPixels3);
}

void test_bitmap_frame_rate_10fps() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["frameRate"] = 10;  // 100ms per frame
	addMultiFrameImages(props, {{"88"}, {"BB"}, {"CC"}});

	effect.add(props);

	// At t=0, frame 0 (red)
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);

	// At t=100ms, frame 1 (green)
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countGreenDominantPixels(canvas) > 0);

	// At t=200ms, frame 2 (blue)
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countBlueDominantPixels(canvas) > 0);

	// At t=300ms, back to frame 0 (red)
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);
}

void test_bitmap_variable_frame_sizes() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["frameRate"] = 2;
	// Frame 1: 2x2, Frame 2: 3x3
	addMultiFrameImages(props, {{"88", "88"}, {"BBB", "BBB", "BBB"}});

	effect.add(props);

	// Both frames should render without crash
	canvas.clear();
	effect.render();
	int pixels1 = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixels1 > 0);

	effect.update(0.5f);
	canvas.clear();
	effect.render();
	int pixels2 = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixels2 > 0);

	// Larger frame should have more pixels
	TEST_ASSERT_TRUE(pixels2 > pixels1);
}

void test_bitmap_animation_with_movement() {
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
	props["frameRate"] = 4;  // 250ms per frame
	props["easing"] = "linear";
	addMultiFrameImages(props, {{"88"}, {"BB"}});

	effect.add(props);

	// At t=0: frame 0, left side
	canvas.clear();
	effect.render();
	BoundingBox box1 = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box1.valid);
	TEST_ASSERT_TRUE(box1.maxX < static_cast<int16_t>(canvas.getWidth() / 2));
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);

	// At t=500ms: frame 0 (cycled), center
	// At 500ms with 250ms frames: 500/250 = 2 -> frame 0 (2 % 2 = 0)
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	BoundingBox box2 = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box2.valid);
	int centerX = (box2.minX + box2.maxX) / 2;
	TEST_ASSERT_INT_WITHIN(8, canvas.getWidth() / 2, centerX);
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);
}

void test_bitmap_empty_images_array() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["images"].to<JsonArray>();  // Empty array

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should render nothing (no crash)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_default_frame_rate() {
	// Verify default 2 FPS when frameRate not specified
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 2000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	// No frameRate specified - should default to 2 FPS
	addMultiFrameImages(props, {{"88"}, {"BB"}});

	effect.add(props);

	// At t=0, frame 0 (red)
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);

	// At t=499ms, still frame 0 (default 2 FPS = 500ms per frame)
	effect.update(0.499f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);

	// At t=501ms, frame 1 (green)
	effect.update(0.002f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countGreenDominantPixels(canvas) > 0);
}

void test_bitmap_fade_with_animation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["fadeIn"] = 200;
	props["fadeOut"] = 200;
	props["frameRate"] = 4;
	addMultiFrameImages(props, {{"77"}, {"77"}});

	effect.add(props);

	// At t=0, fading in (low brightness)
	canvas.clear();
	effect.render();
	uint64_t brightness1 = calculateTotalBrightness(canvas);

	// At t=200ms, fully visible (higher brightness)
	effect.update(0.2f);
	canvas.clear();
	effect.render();
	uint64_t brightness2 = calculateTotalBrightness(canvas);

	TEST_ASSERT_TRUE(brightness2 > brightness1);
}

// =============================================================================
// 12. Memory Management Tests
// =============================================================================

void test_bitmap_memory_tracking() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Initially no memory used
	TEST_ASSERT_EQUAL(0, effect.getTotalMemoryUsed());

	// Add a bitmap
	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	addSingleFrameImage(props, {"77", "77"});
	effect.add(props);

	// Memory should be tracked
	TEST_ASSERT_TRUE(effect.getTotalMemoryUsed() > 0);
	size_t memoryAfterAdd = effect.getTotalMemoryUsed();

	// Expire the bitmap
	effect.update(1.1f);

	// Memory should be released
	TEST_ASSERT_EQUAL(0, effect.getTotalMemoryUsed());
	(void)memoryAfterAdd;  // Suppress unused warning
}

void test_bitmap_memory_budget_enforced() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Add bitmaps until budget is exceeded
	// Each 8x8 bitmap uses ~(64 + overhead) bytes
	int addedCount = 0;
	for (int i = 0; i < 5000; i++) {
		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 10000;
		props["centerX"] = 50;
		props["centerY"] = 50;
		// 8x8 = 64 pixels = 64 bytes + overhead
		addSingleFrameImage(props, {"77777777", "77777777", "77777777", "77777777",
		                            "77777777", "77777777", "77777777", "77777777"});
		size_t beforeAdd = effect.getBitmapCount();
		effect.add(props);
		if (effect.getBitmapCount() > beforeAdd) {
			addedCount++;
		}
	}

	// Should have stopped adding due to budget (128KB = 131072 bytes)
	// Each bitmap is ~200-300 bytes, so we should be able to add 400-600
	TEST_ASSERT_TRUE(addedCount > 100);    // Should add many
	TEST_ASSERT_TRUE(addedCount < 5000);   // But not all
}

void test_bitmap_oversized_frame_rejected() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;

	// Create 33x33 frame (exceeds 32x32 limit)
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	std::string longRow(33, '7');
	for (int i = 0; i < 33; i++) {
		frame.add(longRow.c_str());
	}

	effect.add(props);

	// Should have been rejected
	TEST_ASSERT_EQUAL(0, effect.getBitmapCount());
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_low_heap_rejected() {
	// Set mock heap to very low value
	hal::test::setFreeHeap(16384);  // 16KB - below MIN_FREE_HEAP + any bitmap

	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	addSingleFrameImage(props, {"77", "77"});

	effect.add(props);

	// Should have been rejected due to low heap
	TEST_ASSERT_EQUAL(0, effect.getBitmapCount());

	// Reset heap to normal
	hal::test::setFreeHeap(320000);
}

void test_bitmap_memory_reclaimed_on_expiration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Add bitmap with short duration
	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 100;
	props["centerX"] = 50;
	props["centerY"] = 50;
	addSingleFrameImage(props, {"77777777", "77777777", "77777777", "77777777",
	                            "77777777", "77777777", "77777777", "77777777"});
	effect.add(props);

	size_t memoryAfterAdd = effect.getTotalMemoryUsed();
	TEST_ASSERT_TRUE(memoryAfterAdd > 0);
	TEST_ASSERT_EQUAL(1, effect.getBitmapCount());

	// Expire it
	effect.update(0.2f);

	// Memory should be reclaimed
	TEST_ASSERT_EQUAL(0, effect.getTotalMemoryUsed());
	TEST_ASSERT_EQUAL(0, effect.getBitmapCount());
}

void test_bitmap_reset_clears_memory_tracking() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Add several bitmaps
	for (int i = 0; i < 5; i++) {
		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 10000;
		props["centerX"] = 50;
		props["centerY"] = 50;
		addSingleFrameImage(props, {"77", "77"});
		effect.add(props);
	}

	TEST_ASSERT_TRUE(effect.getTotalMemoryUsed() > 0);
	TEST_ASSERT_EQUAL(5, effect.getBitmapCount());

	// Reset
	effect.reset();

	// All memory should be cleared
	TEST_ASSERT_EQUAL(0, effect.getTotalMemoryUsed());
	TEST_ASSERT_EQUAL(0, effect.getBitmapCount());
}

void test_bitmap_no_leak_after_cycles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	// Rapidly add and expire many bitmaps
	for (int cycle = 0; cycle < 100; cycle++) {
		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 10;  // Very short
		props["centerX"] = 50;
		props["centerY"] = 50;
		addSingleFrameImage(props, {"77", "77"});
		effect.add(props);
		effect.update(0.02f);  // Expire it
	}

	// All bitmaps should be expired, memory should be zero
	TEST_ASSERT_EQUAL(0, effect.getTotalMemoryUsed());
	TEST_ASSERT_EQUAL(0, effect.getBitmapCount());

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_bitmap_frame_limit_enforced() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;

	// Create 40 frames (exceeds MAX_FRAMES_PER_BITMAP = 32)
	JsonArray images = props["images"].to<JsonArray>();
	for (int i = 0; i < 40; i++) {
		JsonArray frame = images.add<JsonArray>();
		frame.add("77");
	}

	effect.add(props);

	// Bitmap should be added, but truncated to 32 frames
	TEST_ASSERT_EQUAL(1, effect.getBitmapCount());

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 13. Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runBitmapDigest(const TestConfig& config, float updateTime,
                                 const std::vector<std::string>& image = {"88", "88"}) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 2000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	for (const auto& row : image) {
		frame.add(row.c_str());
	}
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_bitmap_digest_16x16_t100() {
	uint64_t digest = runBitmapDigest(TEST_CONFIGS[1], 0.1f);
	assertDigest(0x27CEF60B4FB84255ull, digest, "bitmap_16x16_t100");
}

void test_bitmap_digest_16x16_t200_larger() {
	uint64_t digest = runBitmapDigest(TEST_CONFIGS[1], 0.2f, {"8888", "8888", "8888", "8888"});
	assertDigest(0x603E6E7047109465ull, digest, "bitmap_16x16_t200_larger");
}

void test_bitmap_digest_strip_t150() {
	uint64_t digest = runBitmapDigest(TEST_CONFIGS[0], 0.15f);
	assertDigest(0x5BE2E5E462E1D77Dull, digest, "bitmap_strip_t150");
}

void test_bitmap_digest_96x8_t100() {
	uint64_t digest = runBitmapDigest(TEST_CONFIGS[2], 0.1f);
	assertDigest(0x5E6D3FB4DC49F9D5ull, digest, "bitmap_96x8_t100");
}

void test_bitmap_property_static_no_change() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	BitmapEffect effect(matrix, canvas);

	JsonDocument props;
	addPico8Palette(props);
	props["duration"] = 5000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	frame.add("77");
	frame.add("77");
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

	// Static bitmap (no animation, no movement) should not change
	TEST_ASSERT_EQUAL_HEX64_MESSAGE(hash1, hash2, "Static bitmap should not change between frames");
}

void test_bitmap_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		BitmapEffect effect(matrix, canvas);

		JsonDocument props;
		addPico8Palette(props);
		props["duration"] = 5000;
		props["centerX"] = 50;
		props["centerY"] = 50;
		JsonArray images = props["images"].to<JsonArray>();
		JsonArray frame = images.add<JsonArray>();
		frame.add("77");
		frame.add("77");
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
	RUN_TEST(test_bitmap_easing_default_quadraticInOut);
	RUN_TEST(test_bitmap_movement_from_off_canvas_left);
	RUN_TEST(test_bitmap_movement_to_off_canvas_right);
	RUN_TEST(test_bitmap_movement_off_canvas_both_ends);
	RUN_TEST(test_bitmap_movement_off_canvas_vertical);
	RUN_TEST(test_bitmap_negative_percentage_accepted);

	// 9. LED Quantization Tests
	RUN_TEST(test_bitmap_random_x_snapped_to_led);
	RUN_TEST(test_bitmap_random_y_snapped_to_led);
	RUN_TEST(test_bitmap_both_random_snapped_to_led);

	// 10. Strip Layout Tests
	RUN_TEST(test_bitmap_on_strip);

	// 11. Animation Frame Tests
	RUN_TEST(test_bitmap_single_frame_animation);
	RUN_TEST(test_bitmap_two_frame_animation);
	RUN_TEST(test_bitmap_frame_rate_10fps);
	RUN_TEST(test_bitmap_variable_frame_sizes);
	RUN_TEST(test_bitmap_animation_with_movement);
	RUN_TEST(test_bitmap_empty_images_array);
	RUN_TEST(test_bitmap_default_frame_rate);
	RUN_TEST(test_bitmap_fade_with_animation);

	// 12. Memory Management Tests
	RUN_TEST(test_bitmap_memory_tracking);
	RUN_TEST(test_bitmap_memory_budget_enforced);
	RUN_TEST(test_bitmap_oversized_frame_rejected);
	RUN_TEST(test_bitmap_low_heap_rejected);
	RUN_TEST(test_bitmap_memory_reclaimed_on_expiration);
	RUN_TEST(test_bitmap_reset_clears_memory_tracking);
	RUN_TEST(test_bitmap_no_leak_after_cycles);
	RUN_TEST(test_bitmap_frame_limit_enforced);

	// 13. Pixel Digest Tests
	RUN_TEST(test_bitmap_digest_16x16_t100);
	RUN_TEST(test_bitmap_digest_16x16_t200_larger);
	RUN_TEST(test_bitmap_digest_strip_t150);
	RUN_TEST(test_bitmap_digest_96x8_t100);
	RUN_TEST(test_bitmap_property_static_no_change);
	RUN_TEST(test_bitmap_property_all_configs_render);

	return UNITY_END();
}
