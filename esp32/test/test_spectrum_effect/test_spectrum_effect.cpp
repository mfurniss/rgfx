/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for SpectrumEffect
 *
 * Tests the spectrum analyzer effect rendering using the real implementation.
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
#include "effects/spectrum.h"
#include "effects/spectrum.cpp"

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
// Basic Rendering Tests
// =============================================================================

void test_spectrum_renders_columns() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	values.add(5);
	values.add(3);
	values.add(7);
	values.add(1);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should have rendered some pixels
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_spectrum_no_render_with_empty_values() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	props["values"].to<JsonArray>();  // Empty array
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should not render anything
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_spectrum_no_render_without_values() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	// No values array at all
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should not render anything
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Value Mapping Tests
// =============================================================================

void test_spectrum_value_9_full_height() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);  // Single column at max
	effect.add(props);

	canvas.clear();
	effect.render();

	// Column should extend from bottom to top
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Full height means minY should be near 0
	TEST_ASSERT_TRUE(box.minY < canvas.getHeight() / 4);
}

void test_spectrum_value_0_no_height() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(0);  // Single column at zero
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should not render anything for value 0
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_spectrum_value_5_half_height() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(5);  // ~55% height
	effect.add(props);

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Should be roughly half height - minY should be around middle
	uint16_t expectedMinY = canvas.getHeight() / 2;
	TEST_ASSERT_TRUE(box.minY > expectedMinY / 2);
	TEST_ASSERT_TRUE(box.minY < expectedMinY + expectedMinY / 2);
}

// =============================================================================
// Peak Hold Tests
// =============================================================================

void test_spectrum_peak_hold_higher_value() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	// First add with value 5
	JsonDocument props1;
	JsonArray values1 = props1["values"].to<JsonArray>();
	values1.add(5);
	effect.add(props1);

	canvas.clear();
	effect.render();
	int pixels1 = countNonBlackPixels(canvas);

	// Second add with higher value 9
	JsonDocument props2;
	JsonArray values2 = props2["values"].to<JsonArray>();
	values2.add(9);
	effect.add(props2);

	canvas.clear();
	effect.render();
	int pixels2 = countNonBlackPixels(canvas);

	// Should have more pixels after higher value
	TEST_ASSERT_TRUE(pixels2 > pixels1);
}

void test_spectrum_peak_hold_lower_value_ignored() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	// First add with value 9 (max)
	JsonDocument props1;
	JsonArray values1 = props1["values"].to<JsonArray>();
	values1.add(9);
	effect.add(props1);

	canvas.clear();
	effect.render();
	int pixels1 = countNonBlackPixels(canvas);

	// Second add with lower value 3
	JsonDocument props2;
	JsonArray values2 = props2["values"].to<JsonArray>();
	values2.add(3);
	effect.add(props2);

	canvas.clear();
	effect.render();
	int pixels2 = countNonBlackPixels(canvas);

	// Should have same pixels (lower value ignored)
	TEST_ASSERT_EQUAL(pixels1, pixels2);
}

// =============================================================================
// Decay Tests
// =============================================================================

void test_spectrum_decays_over_time() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	effect.add(props);

	canvas.clear();
	effect.render();
	int pixelsBefore = countNonBlackPixels(canvas);

	// Exhaust hold time first, then apply decay
	effect.update(0.1f);  // Exhaust 100ms hold
	effect.update(0.3f);  // 300ms decay

	canvas.clear();
	effect.render();
	int pixelsAfter = countNonBlackPixels(canvas);

	// Should have fewer pixels after decay
	TEST_ASSERT_TRUE(pixelsAfter < pixelsBefore);
}

void test_spectrum_decays_to_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	effect.add(props);

	// Exhaust hold time first, then apply enough decay to reach zero
	effect.update(0.1f);  // Exhaust 100ms hold
	effect.update(0.6f);  // ~0.5s decay at rate 2.1

	canvas.clear();
	effect.render();

	// Should be fully decayed
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_spectrum_custom_decay_rate() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	props["decayRate"] = 10.0f;  // Very fast decay
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	effect.add(props);

	// Exhaust hold time first, then apply fast decay
	effect.update(0.1f);   // Exhaust 100ms hold
	effect.update(0.15f);  // 150ms decay at rate 10 = 1.5 (full column)

	canvas.clear();
	effect.render();

	// Should be fully decayed
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Column Count Tests
// =============================================================================

void test_spectrum_dynamic_column_increase() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	// Start with 3 columns
	JsonDocument props1;
	JsonArray values1 = props1["values"].to<JsonArray>();
	values1.add(5);
	values1.add(5);
	values1.add(5);
	effect.add(props1);

	canvas.clear();
	effect.render();
	BoundingBox box1 = findBoundingBox(canvas);

	// Increase to 5 columns
	JsonDocument props2;
	JsonArray values2 = props2["values"].to<JsonArray>();
	values2.add(5);
	values2.add(5);
	values2.add(5);
	values2.add(5);
	values2.add(5);
	effect.add(props2);

	canvas.clear();
	effect.render();
	BoundingBox box2 = findBoundingBox(canvas);

	// Should have wider coverage with more columns
	TEST_ASSERT_TRUE(box2.valid);
	TEST_ASSERT_TRUE(box1.valid);
	// Both should render across canvas width
}

void test_spectrum_dynamic_column_decrease() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	// Start with 5 columns
	JsonDocument props1;
	JsonArray values1 = props1["values"].to<JsonArray>();
	values1.add(5);
	values1.add(5);
	values1.add(5);
	values1.add(5);
	values1.add(5);
	effect.add(props1);

	// Decrease to 2 columns
	JsonDocument props2;
	JsonArray values2 = props2["values"].to<JsonArray>();
	values2.add(5);
	values2.add(5);
	effect.add(props2);

	canvas.clear();
	effect.render();

	// Should still render
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Reset Tests
// =============================================================================

void test_spectrum_reset_clears_columns() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	values.add(9);
	values.add(9);
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
// Color Tests
// =============================================================================

void test_spectrum_columns_have_color() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	values.add(9);
	values.add(9);
	values.add(9);
	values.add(9);
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should have colored pixels (from rainbow palette)
	bool hasRed = false;
	bool hasGreen = false;
	bool hasBlue = false;

	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 100) hasRed = true;
			if (pixel.g > 100) hasGreen = true;
			if (pixel.b > 100) hasBlue = true;
		}
	}

	// With 5 columns and rainbow palette, should have multiple colors
	TEST_ASSERT_TRUE(hasRed || hasGreen || hasBlue);
}

// =============================================================================
// Edge Cases
// =============================================================================

void test_spectrum_value_clamping_high() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(15);  // Above max 9
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render (clamped to 9)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_spectrum_value_clamping_negative() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(-5);  // Negative
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render nothing (clamped to 0)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_spectrum_single_column() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);  // Single column
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should render full width for single column
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_EQUAL(0, box.minX);
}

void test_spectrum_many_columns() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	for (int i = 0; i < 16; i++) {
		values.add(5);
	}
	effect.add(props);

	canvas.clear();
	effect.render();

	// Should still render even with many columns
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Strip Layout Tests
// =============================================================================

void test_spectrum_strip_layout() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	values.add(5);
	values.add(3);
	effect.add(props);

	canvas.clear();
	effect.render();

	// On strip (height=1), columns are still rendered but only 1 pixel tall
	// Should have some pixels
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runSpectrumDigest(const TestConfig& config, float updateTime,
                                   const std::vector<int>& spectrumValues = {9, 5, 3, 7, 1}) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	for (int val : spectrumValues) {
		values.add(val);
	}
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_spectrum_digest_16x16_t100() {
	uint64_t digest = runSpectrumDigest(TEST_CONFIGS[1], 0.1f);
	assertDigest(0x894D080FED442445ull, digest, "spectrum_16x16_t100");
}

void test_spectrum_digest_16x16_t200_different_values() {
	uint64_t digest = runSpectrumDigest(TEST_CONFIGS[1], 0.2f, {9, 9, 9, 9, 9});
	assertDigest(0xA785E60ACDDFAca5ull, digest, "spectrum_16x16_t200_full");
}

void test_spectrum_digest_strip_t150() {
	uint64_t digest = runSpectrumDigest(TEST_CONFIGS[0], 0.15f);
	assertDigest(0x72D3BFE13779F944ull, digest, "spectrum_strip_t150");
}

void test_spectrum_digest_96x8_t100() {
	uint64_t digest = runSpectrumDigest(TEST_CONFIGS[2], 0.1f);
	assertDigest(0x53D2AD84FA6FDC9Dull, digest, "spectrum_96x8_t100");
}

void test_spectrum_property_decay_changes() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SpectrumEffect effect(matrix, canvas);

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(9);
	values.add(9);
	values.add(9);
	effect.add(props);

	effect.update(0.0f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash1 = computeFrameDigest(matrix);

	// Exhaust hold time (100ms default) then decay over time
	effect.update(0.1f);   // Exhaust hold time
	effect.update(0.3f);   // Then decay
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash2 = computeFrameDigest(matrix);

	TEST_ASSERT_NOT_EQUAL_MESSAGE(hash1, hash2, "Spectrum should decay over time");
}

void test_spectrum_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		SpectrumEffect effect(matrix, canvas);

		JsonDocument props;
		JsonArray values = props["values"].to<JsonArray>();
		values.add(9);
		values.add(5);
		values.add(3);
		effect.add(props);

		effect.update(0.0f);
		canvas.clear();
		effect.render();
		downsampleToMatrix(canvas, &matrix);

		FrameProperties fp = analyzeFrame(matrix);
		char msg[64];
		snprintf(msg, sizeof(msg), "Config %zu should have pixels", i);
		TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels, msg);
	}
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Basic rendering
	RUN_TEST(test_spectrum_renders_columns);
	RUN_TEST(test_spectrum_no_render_with_empty_values);
	RUN_TEST(test_spectrum_no_render_without_values);

	// Value mapping
	RUN_TEST(test_spectrum_value_9_full_height);
	RUN_TEST(test_spectrum_value_0_no_height);
	RUN_TEST(test_spectrum_value_5_half_height);

	// Peak hold
	RUN_TEST(test_spectrum_peak_hold_higher_value);
	RUN_TEST(test_spectrum_peak_hold_lower_value_ignored);

	// Decay
	RUN_TEST(test_spectrum_decays_over_time);
	RUN_TEST(test_spectrum_decays_to_zero);
	RUN_TEST(test_spectrum_custom_decay_rate);

	// Column count
	RUN_TEST(test_spectrum_dynamic_column_increase);
	RUN_TEST(test_spectrum_dynamic_column_decrease);

	// Reset
	RUN_TEST(test_spectrum_reset_clears_columns);

	// Colors
	RUN_TEST(test_spectrum_columns_have_color);

	// Edge cases
	RUN_TEST(test_spectrum_value_clamping_high);
	RUN_TEST(test_spectrum_value_clamping_negative);
	RUN_TEST(test_spectrum_single_column);
	RUN_TEST(test_spectrum_many_columns);

	// Strip layout
	RUN_TEST(test_spectrum_strip_layout);

	// Pixel Digest Tests
	RUN_TEST(test_spectrum_digest_16x16_t100);
	RUN_TEST(test_spectrum_digest_16x16_t200_different_values);
	RUN_TEST(test_spectrum_digest_strip_t150);
	RUN_TEST(test_spectrum_digest_96x8_t100);
	RUN_TEST(test_spectrum_property_decay_changes);
	RUN_TEST(test_spectrum_property_all_configs_render);

	return UNITY_END();
}
