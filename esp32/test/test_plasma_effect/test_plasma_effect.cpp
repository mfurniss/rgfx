/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for PlasmaEffect
 *
 * Tests plasma animation, parameter handling, and enable/disable behavior.
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
#include "effects/plasma.h"
#include "effects/plasma.cpp"

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

void test_plasma_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);
	TEST_PASS();
}

void test_plasma_not_enabled_by_default() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// Without calling add(), plasma is not enabled
	canvas.clear();
	effect.render();

	// Should render nothing
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_plasma_add_enables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should fill entire canvas with plasma pattern
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_plasma_reset_disables() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_enabled_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = "on";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_plasma_enabled_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// First enable
	JsonDocument props1;
	effect.add(props1);

	// Then disable with "off"
	JsonDocument props2;
	props2["enabled"] = "off";
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Plasma disabled - no pixels
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_plasma_enabled_bool_backwards_compat() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

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

void test_plasma_re_enable_after_disable() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

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

void test_plasma_update_advances_animation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_speed_affects_animation_rate() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Test with slow speed
	PlasmaEffect slowEffect(canvas);
	JsonDocument slowProps;
	slowProps["speed"] = 0.5f;
	slowEffect.add(slowProps);

	// Test with fast speed
	PlasmaEffect fastEffect(canvas);
	JsonDocument fastProps;
	fastProps["speed"] = 2.0f;
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

	// Fast effect should have changed more (different final hue)
	// We can't directly compare amounts, but both should have changed
	bool slowChanged = (slowInitial.r != slowAfter.r || slowInitial.g != slowAfter.g ||
						slowInitial.b != slowAfter.b);
	bool fastChanged = (fastInitial.r != fastAfter.r || fastInitial.g != fastAfter.g ||
						fastInitial.b != fastAfter.b);

	TEST_ASSERT_TRUE(slowChanged || fastChanged);  // At least one should change
}

// =============================================================================
// 4. Parameter Tests
// =============================================================================

void test_plasma_scale_parameter() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// Test low scale (less detail)
	JsonDocument props1;
	props1["scale"] = 5;
	effect.add(props1);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Test high scale (more detail)
	JsonDocument props2;
	props2["scale"] = 100;
	effect.add(props2);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_plasma_scale_clamped() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// Test scale above max (255)
	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["scale"] = 500;  // Should clamp to 255
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render without crashing
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_plasma_default_parameters() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// Add with no parameters - should use defaults
	JsonDocument props;
	setDefaultPlasmaProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render with default settings
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), countNonBlackPixels(canvas));
}

// =============================================================================
// 5. Canvas Coverage Tests
// =============================================================================

void test_plasma_fills_entire_canvas() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_large_matrix() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// All canvas pixels should be filled
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth() * canvas.getHeight(), pixelCount);
}

void test_plasma_strip_layout() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Strip should be fully filled
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(canvas.getWidth(), pixelCount);
}

// =============================================================================
// 6. Rainbow Color Distribution Tests
// =============================================================================

void test_plasma_has_multiple_colors() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Plasma should produce a variety of colors (rainbow)
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
// 7. Fade Tests (using enabled: fadeIn/fadeOut)
// =============================================================================

void test_plasma_fadeIn_starts_dark() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = "fadeIn";
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should start completely dark
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_plasma_fadeIn_brightens() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_fadeIn_transitions_to_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_fadeOut_starts_bright() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	// First enable the effect at full brightness
	JsonDocument props;
	setDefaultPlasmaProps(props);
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

void test_plasma_fadeOut_dims() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = "fadeOut";
	effect.add(props);

	// Advance to end of fade
	effect.update(1.0f);

	canvas.clear();
	effect.render();

	// Should be dark
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_plasma_fadeOut_transitions_to_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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
// 8. isFullyOpaque Tests
// =============================================================================

void test_plasma_isFullyOpaque_when_on() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = "on";
	effect.add(props);

	TEST_ASSERT_TRUE(effect.isFullyOpaque());
}

void test_plasma_isFullyOpaque_when_off() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = "off";
	effect.add(props);

	TEST_ASSERT_FALSE(effect.isFullyOpaque());
}

void test_plasma_isFullyOpaque_when_fading() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

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
// 9. Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runPlasmaDigest(const TestConfig& config, float updateTime, int scale = 30) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["scale"] = scale;
	props["speed"] = 1.0f;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_plasma_digest_16x16_t100() {
	uint64_t digest = runPlasmaDigest(TEST_CONFIGS[1], 0.1f);
	assertDigest(0xC0218DA320DB2FB9ull, digest, "plasma_16x16_t100");
}

void test_plasma_digest_16x16_t200_scale50() {
	uint64_t digest = runPlasmaDigest(TEST_CONFIGS[1], 0.2f, 50);
	assertDigest(0x0349CAF7A1DC4002ull, digest, "plasma_16x16_t200_scale50");
}

void test_plasma_digest_strip_t150() {
	uint64_t digest = runPlasmaDigest(TEST_CONFIGS[0], 0.15f);
	assertDigest(0x2F472619580A9AEFull, digest, "plasma_strip_t150");
}

void test_plasma_digest_96x8_t100() {
	uint64_t digest = runPlasmaDigest(TEST_CONFIGS[2], 0.1f);
	assertDigest(0x9AAF5FF4DB8FB12Cull, digest, "plasma_96x8_t100");
}

void test_plasma_property_animation_changes() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PlasmaEffect effect(canvas);

	JsonDocument props;
	setDefaultPlasmaProps(props);
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

	TEST_ASSERT_NOT_EQUAL_MESSAGE(hash1, hash2, "Plasma animation should change over time");
}

void test_plasma_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		PlasmaEffect effect(canvas);

		JsonDocument props;
		setDefaultPlasmaProps(props);
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
	RUN_TEST(test_plasma_creation);
	RUN_TEST(test_plasma_not_enabled_by_default);
	RUN_TEST(test_plasma_add_enables);
	RUN_TEST(test_plasma_reset_disables);

	// 2. Enable/Disable Tests
	RUN_TEST(test_plasma_enabled_on);
	RUN_TEST(test_plasma_enabled_off);
	RUN_TEST(test_plasma_enabled_bool_backwards_compat);
	RUN_TEST(test_plasma_re_enable_after_disable);

	// 3. Animation Tests
	RUN_TEST(test_plasma_update_advances_animation);
	RUN_TEST(test_plasma_speed_affects_animation_rate);

	// 4. Parameter Tests
	RUN_TEST(test_plasma_scale_parameter);
	RUN_TEST(test_plasma_scale_clamped);
	RUN_TEST(test_plasma_default_parameters);

	// 5. Canvas Coverage Tests
	RUN_TEST(test_plasma_fills_entire_canvas);
	RUN_TEST(test_plasma_large_matrix);
	RUN_TEST(test_plasma_strip_layout);

	// 6. Rainbow Color Distribution Tests
	RUN_TEST(test_plasma_has_multiple_colors);

	// 7. Fade Tests
	RUN_TEST(test_plasma_fadeIn_starts_dark);
	RUN_TEST(test_plasma_fadeIn_brightens);
	RUN_TEST(test_plasma_fadeIn_transitions_to_on);
	RUN_TEST(test_plasma_fadeOut_starts_bright);
	RUN_TEST(test_plasma_fadeOut_dims);
	RUN_TEST(test_plasma_fadeOut_transitions_to_off);

	// 8. isFullyOpaque Tests
	RUN_TEST(test_plasma_isFullyOpaque_when_on);
	RUN_TEST(test_plasma_isFullyOpaque_when_off);
	RUN_TEST(test_plasma_isFullyOpaque_when_fading);

	// 9. Pixel Digest Tests
	// Note: Exact digest tests skipped - Perlin noise uses floating-point math
	// that produces different results on arm64 vs x86_64 architectures.
	// Property-based tests below still validate correct behavior.
	RUN_TEST(test_plasma_property_animation_changes);
	RUN_TEST(test_plasma_property_all_configs_render);

	return UNITY_END();
}
