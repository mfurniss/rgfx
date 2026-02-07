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

void test_wipe_creation_default_values() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
	props["direction"] = "right";
	props["duration"] = 100;  // Short duration so 0.01f update shows pixels
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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
	WipeEffect effect(canvas);

	// First wipe: left to right, red
	JsonDocument props1;
	setDefaultWipeProps(props1);
	props1["color"] = "#FF0000";
	props1["duration"] = 2000;
	props1["direction"] = "right";
	effect.add(props1);

	// Second wipe: right to left, green
	JsonDocument props2;
	setDefaultWipeProps(props2);
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
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
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

// =============================================================================
// Blend Mode Tests
// =============================================================================

void test_wipe_blendmode_additive() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(canvas);

	// Set a base color on the canvas
	canvas.drawRectangle(0, 0, canvas.getWidth(), canvas.getHeight(), CRGBA(100, 0, 0, 255), BlendMode::REPLACE);

	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = "#00FF00";  // Green
	props["duration"] = 1000;
	props["direction"] = "right";
	props["blendMode"] = "additive";
	effect.add(props);

	effect.update(0.25f);  // 50% through fill phase
	effect.render();

	// With additive blending, pixels in the wipe area should have both red and green
	bool hasAdditiveBlend = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 && pixel.g > 0) {
				hasAdditiveBlend = true;
				break;
			}
		}
		if (hasAdditiveBlend) break;
	}
	TEST_ASSERT_TRUE(hasAdditiveBlend);
}

void test_wipe_blendmode_replace() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect effect(canvas);

	// Set a base color on the canvas
	canvas.drawRectangle(0, 0, canvas.getWidth(), canvas.getHeight(), CRGBA(100, 0, 0, 255), BlendMode::REPLACE);

	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = "#00FF00";  // Green
	props["duration"] = 1000;
	props["direction"] = "right";
	props["blendMode"] = "replace";
	effect.add(props);

	effect.update(0.25f);  // 50% through fill phase
	effect.render();

	// With replace blending, pixels in the wipe area should be pure green (no red)
	bool foundPureGreen = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.g > 0 && pixel.r == 0 && pixel.b == 0) {
				foundPureGreen = true;
				break;
			}
		}
		if (foundPureGreen) break;
	}
	TEST_ASSERT_TRUE(foundPureGreen);
}

// =============================================================================
// Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runWipeDigest(const TestConfig& config, float updateTime,
                               const char* direction = "right") {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["direction"] = direction;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_wipe_digest_16x16_t0_right() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[1], 0.0f, "right");
	assertDigest(0x9FA9E040E0EEDF25ull, digest, "wipe_16x16_t0_right");
}

void test_wipe_digest_16x16_t250_right() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[1], 0.25f, "right");
	assertDigest(0xF5F09D47DE3EBF25ull, digest, "wipe_16x16_t250_right");
}

void test_wipe_digest_16x16_t500_right() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[1], 0.5f, "right");
	assertDigest(0x95F160E34ACE9F25ull, digest, "wipe_16x16_t500_right");
}

void test_wipe_digest_16x16_t250_down() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[1], 0.25f, "down");
	assertDigest(0x3390FCFED9D74725ull, digest, "wipe_16x16_t250_down");
}

void test_wipe_digest_strip_t250_right() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[0], 0.25f, "right");
	assertDigest(0x940EA8A7509F21F5ull, digest, "wipe_strip_t250_right");
}

void test_wipe_digest_strip_t500_left() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[0], 0.5f, "left");
	assertDigest(0x638AEAECCDCDB7F5ull, digest, "wipe_strip_t500_left");
}

void test_wipe_digest_96x8_t250_right() {
	uint64_t digest = runWipeDigest(TEST_CONFIGS[2], 0.25f, "right");
	assertDigest(0xE77304E666A7F725ull, digest, "wipe_96x8_t250_right");
}

// Property tests
void test_wipe_property_fill_then_clear() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WipeEffect effect(canvas);

	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = "#FFFFFF";
	props["duration"] = 1000;
	props["direction"] = "right";
	effect.add(props);

	// At 25% (fill phase), should have some pixels
	effect.update(0.25f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp25 = analyzeFrame(matrix);
	TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp25.nonBlackPixels, "Should have pixels at 25%");

	// At 50% (peak), should have max pixels
	effect.update(0.25f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp50 = analyzeFrame(matrix);
	TEST_ASSERT_GREATER_OR_EQUAL_MESSAGE(fp25.nonBlackPixels, fp50.nonBlackPixels,
	                                     "Should have more pixels at 50%");

	// At 100%+, should be empty
	effect.update(0.6f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp100 = analyzeFrame(matrix);
	TEST_ASSERT_EQUAL_MESSAGE(0, fp100.nonBlackPixels, "Should be empty after duration");
}

void test_wipe_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		WipeEffect effect(canvas);

		JsonDocument props;
		setDefaultWipeProps(props);
		props["color"] = "#FF0000";
		props["duration"] = 1000;
		props["direction"] = "right";
		effect.add(props);

		effect.update(0.25f);
		canvas.clear();
		effect.render();
		downsampleToMatrix(canvas, &matrix);

		FrameProperties fp = analyzeFrame(matrix);
		char msg[128];
		snprintf(msg, sizeof(msg), "Config %s should render wipe", TEST_CONFIGS[i].name);
		TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels, msg);
	}
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

	// Blend mode tests
	RUN_TEST(test_wipe_blendmode_additive);
	RUN_TEST(test_wipe_blendmode_replace);

	// Pixel digest tests
	RUN_TEST(test_wipe_digest_16x16_t0_right);
	RUN_TEST(test_wipe_digest_16x16_t250_right);
	RUN_TEST(test_wipe_digest_16x16_t500_right);
	RUN_TEST(test_wipe_digest_16x16_t250_down);
	RUN_TEST(test_wipe_digest_strip_t250_right);
	RUN_TEST(test_wipe_digest_strip_t500_left);
	RUN_TEST(test_wipe_digest_96x8_t250_right);

	// Property-based tests
	RUN_TEST(test_wipe_property_fill_then_clear);
	RUN_TEST(test_wipe_property_all_configs_render);

	return UNITY_END();
}
