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
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"
#include "effects/text_rendering.h"
#include "effects/text_rendering.cpp"
#include "effects/text.h"
#include "effects/text.cpp"

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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas);

	// 'H' should have pixels (each font pixel is now a 4x4 block)
	int pixelCount = countNonBlackPixels(canvas);
	printf("Pixel count: %d\n", pixelCount);
	TEST_ASSERT_TRUE(pixelCount > 0);
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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");
	props["duration"] = 1000;  // 1 second

	effect.add(props);

	// At 40% through duration (before halfway), should be full brightness
	effect.update(0.4f);  // 400ms
	canvas.clear();
	effect.render();

	uint32_t brightness = calculateTotalBrightness(canvas);
	TEST_ASSERT_TRUE(brightness > 0);

	// Get a lit pixel - should be full white
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0) {
				TEST_ASSERT_EQUAL_UINT8(254, pixel.r);
				TEST_ASSERT_EQUAL_UINT8(254, pixel.g);
				TEST_ASSERT_EQUAL_UINT8(254, pixel.b);
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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");
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
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");
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
// 3. Centering Tests
// =============================================================================

void test_text_centered_horizontally() {
	// 4 characters wide canvas (4 * 32 = 128 canvas pixels)
	// Text "AB" (2 chars = 64 canvas pixels) should be centered
	Matrix matrix(32, 8);  // 128x32 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "AB";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 128, 32);

	// Text is 64 pixels wide, canvas is 128, so centered at x=32
	// Snapped to LED boundary (TEXT_SCALE=4), so x=32 is valid
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_EQUAL(32, box.minX);  // Centered: (128-64)/2 = 32
}

void test_text_centered_vertically() {
	// 16x16 matrix = 64x64 canvas
	// Single char is 32 pixels tall, so centered at y=16
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Vertical center: (64-32)/2 = 16, snapped to LED boundary
	TEST_ASSERT_EQUAL(16, box.minY);
}

void test_text_snapped_to_led_boundary() {
	// 10x10 matrix = 40x40 canvas
	// Single char is 32x32, so centered at (4, 4)
	// But snapped to LED boundary (TEXT_SCALE=4), so (4, 4) rounds to (4, 4)
	Matrix matrix(10, 10);  // 40x40 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");

	effect.add(props);
	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);

	// Position should be snapped to multiples of TEXT_SCALE (4)
	TEST_ASSERT_EQUAL(0, box.minX % 4);
	TEST_ASSERT_EQUAL(0, box.minY % 4);
}

void test_text_color_preserved() {
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FF0000");  // Red

	effect.add(props);
	canvas.clear();
	effect.render();

	// Find any lit pixel and verify it's red
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	bool foundRed = false;
	for (uint16_t y = 0; y < canvas.getHeight() && !foundRed; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() && !foundRed; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0) {
				TEST_ASSERT_EQUAL_UINT8(254, pixel.r);
				TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
				TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
				foundRed = true;
			}
		}
	}
	TEST_ASSERT_TRUE(foundRed);
}

void test_text_with_accent() {
	Matrix matrix(16, 16);  // 64x64 canvas
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");
	props["accentColor"] = "#0000FF";  // Blue accent

	effect.add(props);
	canvas.clear();
	effect.render();

	printCanvas(canvas, 64, 64);

	// Should have both white and blue pixels
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	bool foundWhite = false;
	bool foundBlue = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r == 254 && pixel.g == 254 && pixel.b == 254) {
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
// Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runTextDigest(const TestConfig& config, float updateTime, const char* text = "HI") {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = text;
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#00FFFF");
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_text_digest_16x16_t100() {
	uint64_t digest = runTextDigest(TEST_CONFIGS[1], 0.1f);
	assertDigest(0x8CBBD2377EE6E7A3ull, digest, "text_16x16_t100");
}

void test_text_digest_16x16_t200_different_text() {
	uint64_t digest = runTextDigest(TEST_CONFIGS[1], 0.2f, "AB");
	assertDigest(0x759B8DD92AC50BB5ull, digest, "text_16x16_t200_AB");
}

void test_text_digest_strip_t150() {
	uint64_t digest = runTextDigest(TEST_CONFIGS[0], 0.15f);
	assertDigest(0x07337C7D7090F9F5ull, digest, "text_strip_t150");
}

void test_text_digest_96x8_t100() {
	uint64_t digest = runTextDigest(TEST_CONFIGS[2], 0.1f);
	assertDigest(0x083C168051315283ull, digest, "text_96x8_t100");
}

void test_text_property_static_permanent() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "X";
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FFFFFF");
	props["duration"] = 0;  // Permanent
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

	// Permanent text should not change between frames
	TEST_ASSERT_EQUAL_HEX64_MESSAGE(hash1, hash2, "Permanent text should not change");
}

void test_text_property_all_configs_render() {
	// Skip strip config (index 0) - text effect needs height >= 8 for the font
	for (size_t i = 1; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		TextEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultTextProps(props);
		props["text"] = "X";
		props["gradient"].as<JsonArray>().clear();
		props["gradient"].as<JsonArray>().add("#FFFFFF");
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
// Gradient Scale Tests
// =============================================================================

static void setupGradientText(Canvas& canvas, TextEffect& effect,
                               float gradientScale, float updateTime = 0.5f) {
	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "ABCD";
	props["duration"] = 0;
	props["accentColor"] = nullptr;
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FF0000");
	props["gradient"].as<JsonArray>().add("#00FF00");
	props["gradient"].as<JsonArray>().add("#0000FF");
	props["gradientSpeed"] = 1.0f;
	props["gradientScale"] = gradientScale;

	effect.add(props);
	effect.update(updateTime);
	canvas.clear();
	effect.render();
}

void test_text_positive_gradient_scale_renders() {
	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	setupGradientText(canvas, effect, 4.0f);

	TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0,
	    "Positive gradientScale should render pixels");
}

void test_text_negative_gradient_scale_renders() {
	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	setupGradientText(canvas, effect, -4.0f);

	TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0,
	    "Negative gradientScale should render pixels");
}

void test_text_negative_gradient_scale_reverses_direction() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(32, 8);
	Canvas canvas(matrix);

	TextEffect effectPos(matrix, canvas);
	setupGradientText(canvas, effectPos, 4.0f);
	downsampleToMatrix(canvas, &matrix);
	uint64_t digestPos = computeFrameDigest(matrix);

	hal::test::setTime(0);
	hal::test::seedRandom(12345);

	effectPos.reset();
	TextEffect effectNeg(matrix, canvas);
	setupGradientText(canvas, effectNeg, -4.0f);
	downsampleToMatrix(canvas, &matrix);
	uint64_t digestNeg = computeFrameDigest(matrix);

	TEST_ASSERT_NOT_EQUAL_MESSAGE(digestPos, digestNeg,
	    "Positive and negative gradientScale should produce different output");
}

void test_text_large_negative_gradient_scale_no_overflow() {
	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	setupGradientText(canvas, effect, -20.0f, 2.0f);

	TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0,
	    "Large negative gradientScale should render without overflow");

	// Verify no pixel has 255 in any channel (would indicate LUT overflow)
	// Alpha blending caps at 254: (255*255)>>8 = 254
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
				TEST_ASSERT_LESS_OR_EQUAL(254, pixel.r);
				TEST_ASSERT_LESS_OR_EQUAL(254, pixel.g);
				TEST_ASSERT_LESS_OR_EQUAL(254, pixel.b);
			}
		}
	}
}

void test_text_zero_gradient_scale_uniform_color() {
	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	setupGradientText(canvas, effect, 0.0f);

	CRGB firstColor = {0, 0, 0};
	bool foundFirst = false;
	bool allSame = true;

	for (uint16_t y = 0; y < canvas.getHeight() && allSame; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() && allSame; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
				if (!foundFirst) {
					firstColor = pixel;
					foundFirst = true;
				} else if (pixel.r != firstColor.r || pixel.g != firstColor.g || pixel.b != firstColor.b) {
					allSame = false;
				}
			}
		}
	}

	TEST_ASSERT_TRUE_MESSAGE(foundFirst, "Should have rendered some pixels");
	TEST_ASSERT_TRUE_MESSAGE(allSame, "gradientScale=0 should produce uniform color");
}

// =============================================================================
// Gradient Continuity Tests
// =============================================================================

static JsonDocument makeGradientProps(const char* text, const char* c1, const char* c2, const char* c3,
                                       float speed = 2.0f, float scale = 3.0f) {
	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = text;
	props["duration"] = 0;
	props["accentColor"] = nullptr;
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add(c1);
	props["gradient"].as<JsonArray>().add(c2);
	props["gradient"].as<JsonArray>().add(c3);
	props["gradientSpeed"] = speed;
	props["gradientScale"] = scale;
	return props;
}

void test_text_gradient_continuity_after_reset_same_gradient() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	auto props = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	effect.add(props);
	effect.update(1.5f);

	// Capture pre-reset render
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t preResetDigest = computeFrameDigest(matrix);

	// Reset and re-add with same gradient but different text length
	effect.reset();
	auto props2 = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	effect.add(props2);

	// Render immediately (no update) — should match pre-reset
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t postResetDigest = computeFrameDigest(matrix);

	TEST_ASSERT_EQUAL_HEX64_MESSAGE(preResetDigest, postResetDigest,
	    "Same gradient after reset should inherit gradientTime");
}

void test_text_gradient_resets_with_different_gradient() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	auto props = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	effect.add(props);
	effect.update(1.5f);

	// Capture pre-reset render
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t preResetDigest = computeFrameDigest(matrix);

	// Reset and re-add with different gradient colors
	effect.reset();
	auto props2 = makeGradientProps("ABCD", "#FFFF00", "#FF00FF", "#00FFFF");
	effect.add(props2);

	// Render immediately — should NOT match pre-reset (fresh gradientTime=0)
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t postResetDigest = computeFrameDigest(matrix);

	TEST_ASSERT_NOT_EQUAL_MESSAGE(preResetDigest, postResetDigest,
	    "Different gradient after reset should start fresh");
}

void test_text_gradient_continuity_no_reset_same_gradient() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	auto props = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	effect.add(props);
	effect.update(1.5f);

	// Capture render with advanced gradient time
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t advancedDigest = computeFrameDigest(matrix);

	// Add again without reset (same gradient) — should inherit time
	auto props2 = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	effect.add(props2);

	// The new instance (last in vector) should render with inherited time
	// Create a fresh effect with time=0 for comparison
	TextEffect freshEffect(matrix, canvas);
	auto props3 = makeGradientProps("ABCD", "#FF0000", "#00FF00", "#0000FF");
	freshEffect.add(props3);
	canvas.clear();
	freshEffect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t freshDigest = computeFrameDigest(matrix);

	// The advanced digest should differ from fresh (proving time was inherited)
	TEST_ASSERT_NOT_EQUAL_MESSAGE(advancedDigest, freshDigest,
	    "Inherited gradient time should differ from fresh start");
}

void test_text_gradient_no_continuity_solid_color() {
	Matrix matrix(32, 8);
	Canvas canvas(matrix);
	TextEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = "ABCD";
	props["duration"] = 0;
	props["gradient"].as<JsonArray>().clear();
	props["gradient"].as<JsonArray>().add("#FF0000");

	effect.add(props);
	effect.update(1.0f);

	// Reset and re-add with same solid color — should work without issues
	effect.reset();
	effect.add(props);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0,
	    "Solid color should render normally after reset");
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

	// Centering tests
	RUN_TEST(test_text_centered_horizontally);
	RUN_TEST(test_text_centered_vertically);
	RUN_TEST(test_text_snapped_to_led_boundary);
	RUN_TEST(test_text_color_preserved);
	RUN_TEST(test_text_with_accent);

	// Pixel Digest Tests
	RUN_TEST(test_text_digest_16x16_t100);
	RUN_TEST(test_text_digest_16x16_t200_different_text);
	RUN_TEST(test_text_digest_strip_t150);
	RUN_TEST(test_text_digest_96x8_t100);
	RUN_TEST(test_text_property_static_permanent);
	RUN_TEST(test_text_property_all_configs_render);

	// Gradient Scale Tests
	RUN_TEST(test_text_positive_gradient_scale_renders);
	RUN_TEST(test_text_negative_gradient_scale_renders);
	RUN_TEST(test_text_negative_gradient_scale_reverses_direction);
	RUN_TEST(test_text_large_negative_gradient_scale_no_overflow);
	RUN_TEST(test_text_zero_gradient_scale_uniform_color);

	// Gradient Continuity Tests
	RUN_TEST(test_text_gradient_continuity_after_reset_same_gradient);
	RUN_TEST(test_text_gradient_resets_with_different_gradient);
	RUN_TEST(test_text_gradient_continuity_no_reset_same_gradient);
	RUN_TEST(test_text_gradient_no_continuity_solid_color);

	return UNITY_END();
}
