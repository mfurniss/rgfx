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
	TEST_ASSERT_EQUAL_UINT8(190, tr.g);
	TEST_ASSERT_EQUAL_UINT8(0, tr.b);

	// Bottom-left quadrant should be cyan
	CRGB bl = canvas.getPixel(4, 20);
	TEST_ASSERT_EQUAL_UINT8(0, bl.r);
	TEST_ASSERT_EQUAL_UINT8(180, bl.g);
	TEST_ASSERT_EQUAL_UINT8(180, bl.b);

	// Bottom-right quadrant should be purple
	CRGB br = canvas.getPixel(20, 20);
	TEST_ASSERT_EQUAL_UINT8(160, br.r);
	TEST_ASSERT_EQUAL_UINT8(0, br.g);
	TEST_ASSERT_EQUAL_UINT8(160, br.b);
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

	// Segment 2: Cyan
	CRGB s2 = canvas.getPixel(36, 0);
	TEST_ASSERT_EQUAL_UINT8(0, s2.r);
	TEST_ASSERT_EQUAL_UINT8(139, s2.g);
	TEST_ASSERT_EQUAL_UINT8(139, s2.b);

	// Segment 3: Purple
	CRGB s3 = canvas.getPixel(52, 0);
	TEST_ASSERT_EQUAL_UINT8(255, s3.r);
	TEST_ASSERT_EQUAL_UINT8(0, s3.g);
	TEST_ASSERT_EQUAL_UINT8(255, s3.b);
}

// =============================================================================
// Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runTestLedsDigest(const TestConfig& config) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_test_leds_digest_16x16() {
	uint64_t digest = runTestLedsDigest(TEST_CONFIGS[1]);
	assertDigest(0x43F3BBC8BD95105Bull, digest, "test_leds_16x16");
}

void test_test_leds_digest_strip() {
	uint64_t digest = runTestLedsDigest(TEST_CONFIGS[0]);
	assertDigest(0x18C40A6C7511215Dull, digest, "test_leds_strip");
}

void test_test_leds_digest_96x8() {
	uint64_t digest = runTestLedsDigest(TEST_CONFIGS[2]);
	assertDigest(0xCC42743F2C8F39DBull, digest, "test_leds_96x8");
}

void test_test_leds_property_static_pattern() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	TestLedsEffect effect(matrix, canvas);

	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash1 = computeFrameDigest(matrix);

	// Render again - should be identical (static pattern)
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	uint64_t hash2 = computeFrameDigest(matrix);

	TEST_ASSERT_EQUAL_HEX64_MESSAGE(hash1, hash2, "Test LEDs pattern should be static");
}

void test_test_leds_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		TestLedsEffect effect(matrix, canvas);

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
	RUN_TEST(test_single_panel_has_white_marker_at_origin);
	RUN_TEST(test_strip_layout_has_white_marker_at_start);
	RUN_TEST(test_matrix_quadrants_correct_colors);
	RUN_TEST(test_strip_segments_correct_colors);

	// Pixel Digest Tests
	RUN_TEST(test_test_leds_digest_16x16);
	RUN_TEST(test_test_leds_digest_strip);
	RUN_TEST(test_test_leds_digest_96x8);
	RUN_TEST(test_test_leds_property_static_pattern);
	RUN_TEST(test_test_leds_property_all_configs_render);

	return UNITY_END();
}
