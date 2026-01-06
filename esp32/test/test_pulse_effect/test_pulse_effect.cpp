/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for PulseEffect
 *
 * Tests the pulse effect rendering using the real implementation.
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
#include "utils/easing.h"
#include "utils/easing_impl.cpp"
#include "effects/effect_utils.h"
#include "effects/effect_utils.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/pulse.h"
#include "effects/pulse.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

// =============================================================================
// Driver Config Setup for Digest Tests
// =============================================================================

// Define the driver config struct for testing gamma/floor
struct DriverConfigData {
	float gammaR = 1.0f;
	float gammaG = 1.0f;
	float gammaB = 1.0f;
	uint8_t floorR = 0;
	uint8_t floorG = 0;
	uint8_t floorB = 0;
};

// Global driver config instance
DriverConfigData g_driverConfig;

// Gamma LUT arrays
uint8_t g_gammaLutR[256];
uint8_t g_gammaLutG[256];
uint8_t g_gammaLutB[256];

// Rebuild gamma lookup tables from current config
inline void rebuildGammaLUT() {
	float gammaR = g_driverConfig.gammaR;
	float gammaG = g_driverConfig.gammaG;
	float gammaB = g_driverConfig.gammaB;
	uint8_t floorR = g_driverConfig.floorR;
	uint8_t floorG = g_driverConfig.floorG;
	uint8_t floorB = g_driverConfig.floorB;

	for (int i = 0; i < 256; i++) {
		float normalized = i / 255.0f;
		uint8_t correctedR = (uint8_t)(powf(normalized, gammaR) * 255.0f + 0.5f);
		uint8_t correctedG = (uint8_t)(powf(normalized, gammaG) * 255.0f + 0.5f);
		uint8_t correctedB = (uint8_t)(powf(normalized, gammaB) * 255.0f + 0.5f);

		g_gammaLutR[i] = (correctedR <= floorR) ? 0 : correctedR;
		g_gammaLutG[i] = (correctedG <= floorG) ? 0 : correctedG;
		g_gammaLutB[i] = (correctedB <= floorB) ? 0 : correctedB;
	}
}

// Inline downsample function (avoids driver_config.h Arduino dependency)
inline void downsampleToMatrix(Canvas& canvas, Matrix* matrix) {
	if (!matrix || !matrix->isValid() || !canvas.isValid()) {
		return;
	}

	const uint16_t width = matrix->width;
	const uint16_t height = matrix->height;
	const CRGB* pixels = canvas.getPixels();
	const uint16_t canvasWidth = canvas.getWidth();

	if (matrix->layoutType == LayoutType::STRIP) {
		for (uint16_t x = 0; x < width; x++) {
			const CRGB* block = pixels + (x * 4);
			uint16_t rSum = block[0].r + block[1].r + block[2].r + block[3].r;
			uint16_t gSum = block[0].g + block[1].g + block[2].g + block[3].g;
			uint16_t bSum = block[0].b + block[1].b + block[2].b + block[3].b;

			matrix->led(x, 0) = CRGB(
				g_gammaLutR[rSum >> 2],
				g_gammaLutG[gSum >> 2],
				g_gammaLutB[bSum >> 2]
			);
		}
	} else {
		for (uint16_t y = 0; y < height; y++) {
			const uint16_t canvasY = y * 4;
			for (uint16_t x = 0; x < width; x++) {
				const uint16_t canvasX = x * 4;

				const CRGB* row0 = pixels + (canvasY * canvasWidth) + canvasX;
				const CRGB* row1 = row0 + canvasWidth;
				const CRGB* row2 = row1 + canvasWidth;
				const CRGB* row3 = row2 + canvasWidth;

				uint16_t rSum = row0[0].r + row0[1].r + row0[2].r + row0[3].r
				              + row1[0].r + row1[1].r + row1[2].r + row1[3].r
				              + row2[0].r + row2[1].r + row2[2].r + row2[3].r
				              + row3[0].r + row3[1].r + row3[2].r + row3[3].r;

				uint16_t gSum = row0[0].g + row0[1].g + row0[2].g + row0[3].g
				              + row1[0].g + row1[1].g + row1[2].g + row1[3].g
				              + row2[0].g + row2[1].g + row2[2].g + row2[3].g
				              + row3[0].g + row3[1].g + row3[2].g + row3[3].g;

				uint16_t bSum = row0[0].b + row0[1].b + row0[2].b + row0[3].b
				              + row1[0].b + row1[1].b + row1[2].b + row1[3].b
				              + row2[0].b + row2[1].b + row2[2].b + row2[3].b
				              + row3[0].b + row3[1].b + row3[2].b + row3[3].b;

				matrix->led(x, y) = CRGB(
					g_gammaLutR[rSum >> 4],
					g_gammaLutG[gSum >> 4],
					g_gammaLutB[bSum >> 4]
				);
			}
		}
	}
}

// Include pixel digest helpers (requires DriverConfigData, g_driverConfig, gamma LUTs)
#include "helpers/pixel_digest.h"

using namespace test_helpers;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

void test_pulse_creation_default_values() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	effect.add(props);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Default color is white (#FFFFFF)
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(254, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(254, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(254, pixel.b);
}

void test_pulse_creation_with_color() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["collapse"] = "none";
	effect.add(props);
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(254, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_fade_over_time() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// After 50% time with fade, color should be blended (darker red)
	TEST_ASSERT_LESS_THAN(255, pixel.r);
	TEST_ASSERT_GREATER_THAN(0, pixel.r);
}

void test_pulse_fade_completes() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(1.1f);  // Past duration
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Pulse should be gone
	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_non_fading_stays_full_brightness() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 2000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(254, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_non_fading_expires() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(1.1f);  // Past duration
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_multiple_pulses_exist() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props1;
	setDefaultPulseProps(props1);
	props1["color"] = "#FF0000";
	props1["fade"] = false;
	props1["collapse"] = "none";
	effect.add(props1);

	JsonDocument props2;
	setDefaultPulseProps(props2);
	props2["color"] = "#0000FF";
	props2["fade"] = false;
	props2["collapse"] = "none";
	effect.add(props2);

	canvas.clear();
	effect.update(0.016f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_TRUE(isNonBlack(pixel));
}

void test_pulse_reset_clears_all() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["collapse"] = "none";
	effect.add(props);

	effect.reset();
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_canvas_size_matches_matrix() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Canvas is 4x matrix size
	TEST_ASSERT_EQUAL(32, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
}

void test_pulse_collapse_none_fills_canvas() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.016f);
	effect.render();

	// All corners should be filled (canvas is 16x16 for 4x4 matrix)
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(0, 0).r);
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(15, 0).r);
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(0, 15).r);
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(15, 15).r);
}

void test_pulse_collapse_horizontal_shrinks_height() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "horizontal";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);  // 50% through duration
	effect.render();

	// Center should be filled
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(8, 8).r);

	// Top and bottom edges should be empty (shrunk toward center)
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(8, 0).r);
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(8, 15).r);
}

void test_pulse_collapse_vertical_shrinks_width() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "vertical";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);  // 50% through duration
	effect.render();

	// Center should be filled
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(8, 8).r);

	// Left and right edges should be empty (shrunk toward center)
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(0, 8).r);
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(15, 8).r);
}

// =============================================================================
// Edge Case Tests
// =============================================================================

void test_pulse_collapse_random_selects_one() {
	// Random collapse should select either horizontal or vertical
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "random";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	// With random collapse at 50%, either edges should be clear
	// Either top/bottom OR left/right edges should be empty
	bool topClear = canvas.getPixel(8, 0).r == 0;
	bool leftClear = canvas.getPixel(0, 8).r == 0;

	// At least one pair of edges should be clear (shrunk)
	TEST_ASSERT_TRUE(topClear || leftClear);
}

void test_pulse_strip_layout() {
	// Strip has height=1, so horizontal collapse should act like vertical
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "horizontal";  // For strips, should shrink width
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	// Center should still be filled
	// Note: blending uses >>8 approximation, so (255*255)>>8 = 254
	uint16_t midX = canvas.getWidth() / 2;
	TEST_ASSERT_EQUAL_UINT8(254, canvas.getPixel(midX, 0).g);

	// Edges should be shrunk toward center
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(0, 0).g);
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(canvas.getWidth() - 1, 0).g);
}

void test_pulse_duration_zero() {
	// Duration of 0 should cause immediate expiration
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 0;  // Immediate expiration
	props["collapse"] = "none";
	effect.add(props);

	// Even tiny update should remove it
	effect.update(0.001f);

	canvas.clear();
	effect.render();

	// Should be gone
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(0, 0).r);
}

void test_pulse_multiple_sorted_by_remaining() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	// First pulse: longer duration, red
	JsonDocument props1;
	setDefaultPulseProps(props1);
	props1["color"] = "#FF0000";
	props1["duration"] = 2000;
	props1["fade"] = false;
	props1["collapse"] = "none";
	effect.add(props1);

	// Second pulse: shorter duration, green
	JsonDocument props2;
	setDefaultPulseProps(props2);
	props2["color"] = "#00FF00";
	props2["duration"] = 500;
	props2["fade"] = false;
	props2["collapse"] = "none";
	effect.add(props2);

	effect.update(0.1f);  // Both active
	canvas.clear();
	effect.render();

	// Green should render on top (shorter remaining = rendered last)
	// With additive blending, we should see green added
	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_TRUE(pixel.g > 0);  // Green component present
	TEST_ASSERT_TRUE(pixel.r > 0);  // Red component present (additive)
}

void test_pulse_easing_linear() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	props["easing"] = "linear";
	effect.add(props);

	// At 50% time with linear easing and fade, alpha should be ~127
	effect.update(0.5f);
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	// With linear fade at 50%, alpha ~127, so red ~127
	TEST_ASSERT_INT_WITHIN(20, 127, pixel.r);
}

void test_pulse_easing_quinticOut_default() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	// Default easing is quinticOut
	effect.add(props);

	// At 50% time, alpha = (1-0.5)*255 = 127 (fade is linear based on t)
	effect.update(0.5f);
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	// Fade uses raw t not eased t, so should be similar to linear
	TEST_ASSERT_INT_WITHIN(20, 127, pixel.r);
}

// =============================================================================
// Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

// Helper to run pulse through full pipeline and return digest
static uint64_t runPulseDigest(const TestConfig& config, float updateTime,
                               const char* collapse = "none", bool fade = false) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	// Handle null layout (use default matrix pattern)
	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 800;
	props["easing"] = "quinticOut";
	props["fade"] = fade;
	props["collapse"] = collapse;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

// Digest tests for 16x16 matrix (primary test config)
void test_pulse_digest_16x16_t0_collapse_none() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[1], 0.0f, "none", false);
	assertDigest(0x3F06C5B3B369A725ull, digest, "pulse_16x16_t0_none");
}

void test_pulse_digest_16x16_t400_collapse_none_fade() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[1], 0.5f, "none", true);
	assertDigest(0x0609CAA478C92725ull, digest, "pulse_16x16_t400_none_fade");
}

void test_pulse_digest_16x16_t800_collapse_none_fade() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[1], 1.0f, "none", true);
	assertDigest(0x9FA9E040E0EEDF25ull, digest, "pulse_16x16_t800_none_fade");
}

void test_pulse_digest_16x16_t400_collapse_horizontal() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[1], 0.5f, "horizontal", false);
	assertDigest(0xF71F1460E87F54C5ull, digest, "pulse_16x16_t400_horizontal");
}

void test_pulse_digest_16x16_t400_collapse_vertical() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[1], 0.5f, "vertical", false);
	assertDigest(0x5B188C4D34104785ull, digest, "pulse_16x16_t400_vertical");
}

// Digest tests for 300-LED strip
void test_pulse_digest_strip_t0() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[0], 0.0f, "none", false);
	assertDigest(0x457DA90F8045D7F5ull, digest, "pulse_strip_t0");
}

void test_pulse_digest_strip_t400_fade() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[0], 0.5f, "none", true);
	assertDigest(0xBB8698E56AA7E135ull, digest, "pulse_strip_t400_fade");
}

// Digest tests for 96x8 wide matrix
void test_pulse_digest_96x8_t0() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[2], 0.0f, "none", false);
	assertDigest(0xDCC495A22488AF25ull, digest, "pulse_96x8_t0");
}

void test_pulse_digest_96x8_t400_horizontal() {
	uint64_t digest = runPulseDigest(TEST_CONFIGS[2], 0.5f, "horizontal", false);
	assertDigest(0x1E97CCA2FFBAFF65ull, digest, "pulse_96x8_t400_horizontal");
}

// =============================================================================
// Property-Based Invariant Tests
// =============================================================================

void test_pulse_property_nonblack_at_start() {
	// Property: pulse at t=0 must have non-zero pixels
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 800;
	props["collapse"] = "none";
	effect.add(props);

	effect.update(0.0f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	FrameProperties fp = analyzeFrame(matrix);
	TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels,
	                                 "Pulse at t=0 should have non-black pixels");
}

void test_pulse_property_fades_to_black() {
	// Property: pulse with fade=true must be black after duration expires
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 500;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	// Advance past duration
	effect.update(0.6f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	FrameProperties fp = analyzeFrame(matrix);
	TEST_ASSERT_EQUAL_MESSAGE(0, fp.nonBlackPixels,
	                          "Pulse with fade=true should be black after duration");
}

void test_pulse_property_brightness_decreases_with_fade() {
	// Property: with fade=true, totalBrightness(t+dt) <= totalBrightness(t)
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FFFFFF";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	// Capture brightness at t=0
	effect.update(0.0f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp0 = analyzeFrame(matrix);

	// Capture brightness at t=500ms
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp500 = analyzeFrame(matrix);

	TEST_ASSERT_LESS_OR_EQUAL_MESSAGE(fp0.totalBrightness, fp500.totalBrightness,
	                                  "Brightness should decrease over time with fade=true");
}

void test_pulse_property_collapse_horizontal_shrinks_bbox() {
	// Property: horizontal collapse reduces bounding box height over time
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "horizontal";
	effect.add(props);

	// Capture bbox at t=0
	effect.update(0.0f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp0 = analyzeFrame(matrix);

	// Capture bbox at t=500ms
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp500 = analyzeFrame(matrix);

	int height0 = fp0.boundingBox.maxY - fp0.boundingBox.minY + 1;
	int height500 = fp500.boundingBox.maxY - fp500.boundingBox.minY + 1;

	TEST_ASSERT_LESS_THAN_MESSAGE(height0, height500,
	                              "Horizontal collapse should reduce bbox height");
}

void test_pulse_property_collapse_vertical_shrinks_bbox() {
	// Property: vertical collapse reduces bounding box width over time
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "vertical";
	effect.add(props);

	// Capture bbox at t=0
	effect.update(0.0f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp0 = analyzeFrame(matrix);

	// Capture bbox at t=500ms
	effect.update(0.5f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp500 = analyzeFrame(matrix);

	int width0 = fp0.boundingBox.maxX - fp0.boundingBox.minX + 1;
	int width500 = fp500.boundingBox.maxX - fp500.boundingBox.minX + 1;

	TEST_ASSERT_LESS_THAN_MESSAGE(width0, width500,
	                              "Vertical collapse should reduce bbox width");
}

void test_pulse_property_all_configs_nonblack_at_start() {
	// Property: pulse renders non-black pixels on all three test configs
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		PulseEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultPulseProps(props);
		props["color"] = "#FF0000";
		props["duration"] = 800;
		props["collapse"] = "none";
		effect.add(props);

		effect.update(0.0f);
		canvas.clear();
		effect.render();
		downsampleToMatrix(canvas, &matrix);

		FrameProperties fp = analyzeFrame(matrix);
		char msg[128];
		snprintf(msg, sizeof(msg), "Config %s should have non-black pixels at t=0",
		         TEST_CONFIGS[i].name);
		TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels, msg);
	}
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();
	RUN_TEST(test_pulse_creation_default_values);
	RUN_TEST(test_pulse_creation_with_color);
	RUN_TEST(test_pulse_fade_over_time);
	RUN_TEST(test_pulse_fade_completes);
	RUN_TEST(test_pulse_non_fading_stays_full_brightness);
	RUN_TEST(test_pulse_non_fading_expires);
	RUN_TEST(test_pulse_multiple_pulses_exist);
	RUN_TEST(test_pulse_reset_clears_all);
	RUN_TEST(test_pulse_canvas_size_matches_matrix);
	RUN_TEST(test_pulse_collapse_none_fills_canvas);
	RUN_TEST(test_pulse_collapse_horizontal_shrinks_height);
	RUN_TEST(test_pulse_collapse_vertical_shrinks_width);

	// Edge case tests
	RUN_TEST(test_pulse_collapse_random_selects_one);
	RUN_TEST(test_pulse_strip_layout);
	RUN_TEST(test_pulse_duration_zero);
	RUN_TEST(test_pulse_multiple_sorted_by_remaining);
	RUN_TEST(test_pulse_easing_linear);
	RUN_TEST(test_pulse_easing_quinticOut_default);

	// Pixel digest tests - full pipeline validation
	RUN_TEST(test_pulse_digest_16x16_t0_collapse_none);
	RUN_TEST(test_pulse_digest_16x16_t400_collapse_none_fade);
	RUN_TEST(test_pulse_digest_16x16_t800_collapse_none_fade);
	RUN_TEST(test_pulse_digest_16x16_t400_collapse_horizontal);
	RUN_TEST(test_pulse_digest_16x16_t400_collapse_vertical);
	RUN_TEST(test_pulse_digest_strip_t0);
	RUN_TEST(test_pulse_digest_strip_t400_fade);
	RUN_TEST(test_pulse_digest_96x8_t0);
	RUN_TEST(test_pulse_digest_96x8_t400_horizontal);

	// Property-based invariant tests
	RUN_TEST(test_pulse_property_nonblack_at_start);
	RUN_TEST(test_pulse_property_fades_to_black);
	RUN_TEST(test_pulse_property_brightness_decreases_with_fade);
	RUN_TEST(test_pulse_property_collapse_horizontal_shrinks_bbox);
	RUN_TEST(test_pulse_property_collapse_vertical_shrinks_bbox);
	RUN_TEST(test_pulse_property_all_configs_nonblack_at_start);

	return UNITY_END();
}
