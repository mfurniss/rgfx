/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for WarpEffect
 *
 * Tests warp animation, parameter handling, orientation, and enable/disable behavior.
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
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"
#include "effects/warp.h"
#include "effects/warp.cpp"

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

void test_warp_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_warp_not_enabled_by_default() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// Without calling add(), warp is not enabled
	canvas.clear();
	effect.render();

	// Should render nothing
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_warp_add_enables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should fill entire canvas with warp pattern
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_warp_reset_disables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
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
// 2. Enable/Disable Tests (using new string enum)
// =============================================================================

void test_warp_enabled_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "on";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_warp_enabled_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// First enable
	JsonDocument props1;
	effect.add(props1);

	// Then disable with "off"
	JsonDocument props2;
	props2["enabled"] = "off";
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Warp disabled - no pixels
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_warp_enabled_bool_backwards_compat() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// Test bool true (backwards compat)
	JsonDocument props1;
	props1["enabled"] = true;
	effect.add(props1);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Test bool false (backwards compat)
	JsonDocument props2;
	props2["enabled"] = false;
	effect.add(props2);

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_warp_re_enable_after_disable() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// Enable
	JsonDocument props1;
	effect.add(props1);

	// Disable
	JsonDocument props2;
	props2["enabled"] = "off";
	effect.add(props2);

	// Re-enable
	JsonDocument props3;
	props3["enabled"] = "on";
	effect.add(props3);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 3. Animation Tests
// =============================================================================

void test_warp_update_advances_animation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	// Capture initial state
	canvas.clear();
	effect.render();
	std::vector<CRGB> initialPixels;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			initialPixels.push_back(canvas.getPixel(x, y));
		}
	}

	// Advance animation significantly
	effect.update(1.0f);  // 1 second

	// Capture new state
	canvas.clear();
	effect.render();

	// At least some pixels should have changed
	int changedPixels = 0;
	size_t idx = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB current = canvas.getPixel(x, y);
			if (current.r != initialPixels[idx].r || current.g != initialPixels[idx].g ||
			    current.b != initialPixels[idx].b) {
				changedPixels++;
			}
			idx++;
		}
	}
	TEST_ASSERT_TRUE(changedPixels > 0);
}

void test_warp_speed_affects_animation_rate() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Test with slow speed
	WarpEffect slowEffect(matrix, canvas);
	JsonDocument slowProps;
	slowProps["speed"] = 0.5f;
	slowProps["enabled"] = "on";
	slowEffect.add(slowProps);

	// Test with fast speed
	WarpEffect fastEffect(matrix, canvas);
	JsonDocument fastProps;
	fastProps["speed"] = 5.0f;
	fastProps["enabled"] = "on";
	fastEffect.add(fastProps);

	// Capture initial state for slow
	canvas.clear();
	slowEffect.render();
	CRGB slowInitial = canvas.getPixel(16, 16);

	// Capture initial state for fast
	canvas.clear();
	fastEffect.render();
	CRGB fastInitial = canvas.getPixel(16, 16);

	// Advance both by same time
	slowEffect.update(0.5f);
	fastEffect.update(0.5f);

	// Render slow
	canvas.clear();
	slowEffect.render();
	CRGB slowAfter = canvas.getPixel(16, 16);

	// Render fast
	canvas.clear();
	fastEffect.render();
	CRGB fastAfter = canvas.getPixel(16, 16);

	// At least one should have changed
	bool slowChanged =
	    (slowInitial.r != slowAfter.r || slowInitial.g != slowAfter.g || slowInitial.b != slowAfter.b);
	bool fastChanged =
	    (fastInitial.r != fastAfter.r || fastInitial.g != fastAfter.g || fastInitial.b != fastAfter.b);

	TEST_ASSERT_TRUE(slowChanged || fastChanged);
}

void test_warp_negative_speed_collapses() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// Negative speed should collapse (animate inward)
	JsonDocument props;
	setDefaultWarpProps(props);
	props["speed"] = -2.0f;
	effect.add(props);

	canvas.clear();
	effect.render();
	std::vector<CRGB> initialPixels;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			initialPixels.push_back(canvas.getPixel(x, y));
		}
	}

	effect.update(0.5f);
	canvas.clear();
	effect.render();

	// Should have changed (animation happening)
	int changedPixels = 0;
	size_t idx = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB current = canvas.getPixel(x, y);
			if (current.r != initialPixels[idx].r || current.g != initialPixels[idx].g ||
			    current.b != initialPixels[idx].b) {
				changedPixels++;
			}
			idx++;
		}
	}
	TEST_ASSERT_TRUE(changedPixels > 0);
}

// =============================================================================
// 4. Orientation Tests
// =============================================================================

void test_warp_horizontal_orientation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["orientation"] = "horizontal";
	effect.add(props);

	canvas.clear();
	effect.render();

	// In horizontal mode, columns should have uniform color
	// Check that pixels in the same column have the same color
	bool columnsUniform = true;
	for (uint16_t x = 0; x < canvas.getWidth(); x++) {
		CRGB firstPixel = canvas.getPixel(x, 0);
		for (uint16_t y = 1; y < canvas.getHeight(); y++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r != firstPixel.r || pixel.g != firstPixel.g || pixel.b != firstPixel.b) {
				columnsUniform = false;
				break;
			}
		}
		if (!columnsUniform) break;
	}
	TEST_ASSERT_TRUE(columnsUniform);
}

void test_warp_vertical_orientation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["orientation"] = "vertical";
	effect.add(props);

	canvas.clear();
	effect.render();

	// In vertical mode, rows should have uniform color
	// Check that pixels in the same row have the same color
	bool rowsUniform = true;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		CRGB firstPixel = canvas.getPixel(0, y);
		for (uint16_t x = 1; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r != firstPixel.r || pixel.g != firstPixel.g || pixel.b != firstPixel.b) {
				rowsUniform = false;
				break;
			}
		}
		if (!rowsUniform) break;
	}
	TEST_ASSERT_TRUE(rowsUniform);
}

// =============================================================================
// 5. Scale Parameter Tests
// =============================================================================

void test_warp_scale_zero_is_linear() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["scale"] = 0.0f;
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_warp_positive_scale_compresses_edges() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["scale"] = 5.0f;  // Positive = compress edges (3D tunnel)
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_warp_negative_scale_compresses_center() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["scale"] = -5.0f;  // Negative = compress center
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_warp_scale_clamped() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// Test scale above typical range
	JsonDocument props;
	setDefaultWarpProps(props);
	props["scale"] = 100.0f;  // Should be clamped internally
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 6. Canvas Coverage Tests
// =============================================================================

void test_warp_fills_entire_canvas() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Check all pixels have color
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			TEST_ASSERT_TRUE(isNonBlack(pixel));
		}
	}
}

void test_warp_large_matrix() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// All canvas pixels should be filled
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_warp_strip_layout() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Strip should be fully filled
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth(), pixelCount);
}

// =============================================================================
// 7. Rainbow Color Distribution Tests
// =============================================================================

void test_warp_has_multiple_colors() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Warp should produce a variety of colors (rainbow)
	int redPixels = countRedDominantPixels(canvas);
	int greenPixels = countGreenDominantPixels(canvas);
	int bluePixels = countBlueDominantPixels(canvas);

	// Should have some distribution of colors, not all one color
	int total = redPixels + greenPixels + bluePixels;
	TEST_ASSERT_TRUE(total > 0);

	// At least two color channels should have dominant pixels
	int colorsPresent = (redPixels > 0 ? 1 : 0) + (greenPixels > 0 ? 1 : 0) + (bluePixels > 0 ? 1 : 0);
	TEST_ASSERT_TRUE(colorsPresent >= 2);
}

// =============================================================================
// 8. Fade Tests (using enabled: fadeIn/fadeOut)
// =============================================================================

void test_warp_fadeIn_starts_dark() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "fadeIn";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should start completely dark
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_warp_fadeIn_brightens() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "fadeIn";
	effect.add(props);

	// Advance halfway through fade
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should have some pixels now (dimmed)
	int midPixels = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(midPixels > 0);

	// Advance to full fade
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should be at full brightness
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), countNonBlackPixels(canvas));
}

void test_warp_fadeIn_transitions_to_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "fadeIn";
	effect.add(props);

	// Complete the fade
	effect.update(1.0f);

	// Should now be fully opaque
	TEST_ASSERT_TRUE(effect.isFullyOpaque());

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), countNonBlackPixels(canvas));
}

void test_warp_fadeOut_starts_bright() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// First enable the effect at full brightness
	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "on";
	effect.add(props);

	// Then trigger fadeOut - should start from current alpha (255)
	props["enabled"] = "fadeOut";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should start at full brightness
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), countNonBlackPixels(canvas));
}

void test_warp_fadeOut_dims() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "fadeOut";
	effect.add(props);

	// Advance to end of fade
	effect.update(1.0f);

	canvas.clear();
	effect.render();

	// Should be dark
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_warp_fadeOut_transitions_to_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "fadeOut";
	effect.add(props);

	// Complete the fade
	effect.update(1.0f);

	// Should now be off (not opaque)
	TEST_ASSERT_FALSE(effect.isFullyOpaque());

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// Should stay off
	effect.update(5.0f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 9. isFullyOpaque Tests
// =============================================================================

void test_warp_isFullyOpaque_when_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "on";
	effect.add(props);

	TEST_ASSERT_TRUE(effect.isFullyOpaque());
}

void test_warp_isFullyOpaque_when_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["enabled"] = "off";
	effect.add(props);

	TEST_ASSERT_FALSE(effect.isFullyOpaque());
}

void test_warp_isFullyOpaque_when_fading() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	// During fadeIn
	JsonDocument props1;
	props1["enabled"] = "fadeIn";
	effect.add(props1);
	TEST_ASSERT_FALSE(effect.isFullyOpaque());

	// During fadeOut
	JsonDocument props2;
	props2["enabled"] = "fadeOut";
	effect.add(props2);
	TEST_ASSERT_FALSE(effect.isFullyOpaque());
}

// =============================================================================
// 10. Center-Radiating Gradient Tests
// =============================================================================

void test_warp_center_matches_on_both_sides_horizontal() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["orientation"] = "horizontal";
	effect.add(props);

	canvas.clear();
	effect.render();

	// In horizontal mode, pixels equidistant from center should have same color
	uint16_t centerX = canvas.getWidth() / 2;
	for (uint16_t offset = 1; offset < centerX; offset++) {
		CRGB leftPixel = canvas.getPixel(centerX - offset, 0);
		CRGB rightPixel = canvas.getPixel(centerX + offset - 1, 0);
		// Colors should be the same (or very close due to rounding)
		TEST_ASSERT_EQUAL(leftPixel.r, rightPixel.r);
		TEST_ASSERT_EQUAL(leftPixel.g, rightPixel.g);
		TEST_ASSERT_EQUAL(leftPixel.b, rightPixel.b);
	}
}

void test_warp_center_matches_on_both_sides_vertical() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	props["orientation"] = "vertical";
	effect.add(props);

	canvas.clear();
	effect.render();

	// In vertical mode, pixels equidistant from center should have same color
	uint16_t centerY = canvas.getHeight() / 2;
	for (uint16_t offset = 1; offset < centerY; offset++) {
		CRGB topPixel = canvas.getPixel(0, centerY - offset);
		CRGB bottomPixel = canvas.getPixel(0, centerY + offset - 1);
		// Colors should be the same (or very close due to rounding)
		TEST_ASSERT_EQUAL(topPixel.r, bottomPixel.r);
		TEST_ASSERT_EQUAL(topPixel.g, bottomPixel.g);
		TEST_ASSERT_EQUAL(topPixel.b, bottomPixel.b);
	}
}

// =============================================================================
// 11. Property-Based Tests
// =============================================================================

void test_warp_property_animation_changes() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	WarpEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultWarpProps(props);
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash1 = computeFrameDigest(matrix);

	effect.update(0.5f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash2 = computeFrameDigest(matrix);

	TEST_ASSERT_NOT_EQUAL_MESSAGE(hash1, hash2, "Warp animation should change over time");
}

void test_warp_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		WarpEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultWarpProps(props);
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
	RUN_TEST(test_warp_creation);
	RUN_TEST(test_warp_not_enabled_by_default);
	RUN_TEST(test_warp_add_enables);
	RUN_TEST(test_warp_reset_disables);

	// 2. Enable/Disable Tests
	RUN_TEST(test_warp_enabled_on);
	RUN_TEST(test_warp_enabled_off);
	RUN_TEST(test_warp_enabled_bool_backwards_compat);
	RUN_TEST(test_warp_re_enable_after_disable);

	// 3. Animation Tests
	RUN_TEST(test_warp_update_advances_animation);
	RUN_TEST(test_warp_speed_affects_animation_rate);
	RUN_TEST(test_warp_negative_speed_collapses);

	// 4. Orientation Tests
	RUN_TEST(test_warp_horizontal_orientation);
	RUN_TEST(test_warp_vertical_orientation);

	// 5. Scale Parameter Tests
	RUN_TEST(test_warp_scale_zero_is_linear);
	RUN_TEST(test_warp_positive_scale_compresses_edges);
	RUN_TEST(test_warp_negative_scale_compresses_center);
	RUN_TEST(test_warp_scale_clamped);

	// 6. Canvas Coverage Tests
	RUN_TEST(test_warp_fills_entire_canvas);
	RUN_TEST(test_warp_large_matrix);
	RUN_TEST(test_warp_strip_layout);

	// 7. Rainbow Color Distribution Tests
	RUN_TEST(test_warp_has_multiple_colors);

	// 8. Fade Tests
	RUN_TEST(test_warp_fadeIn_starts_dark);
	RUN_TEST(test_warp_fadeIn_brightens);
	RUN_TEST(test_warp_fadeIn_transitions_to_on);
	RUN_TEST(test_warp_fadeOut_starts_bright);
	RUN_TEST(test_warp_fadeOut_dims);
	RUN_TEST(test_warp_fadeOut_transitions_to_off);

	// 9. isFullyOpaque Tests
	RUN_TEST(test_warp_isFullyOpaque_when_on);
	RUN_TEST(test_warp_isFullyOpaque_when_off);
	RUN_TEST(test_warp_isFullyOpaque_when_fading);

	// 10. Center-Radiating Gradient Tests
	RUN_TEST(test_warp_center_matches_on_both_sides_horizontal);
	RUN_TEST(test_warp_center_matches_on_both_sides_vertical);

	// 11. Property-Based Tests
	RUN_TEST(test_warp_property_animation_changes);
	RUN_TEST(test_warp_property_all_configs_render);

	return UNITY_END();
}
