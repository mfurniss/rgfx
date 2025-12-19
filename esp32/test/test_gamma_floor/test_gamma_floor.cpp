/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test: Gamma LUT with Floor Cutoff
 *
 * Tests that the gamma lookup table correctly applies floor cutoff values.
 * Values at or below the floor should become 0 after gamma correction.
 */

#include <unity.h>
#include <cstdint>
#include <cmath>

// Mock Arduino String
#include <string>
using String = std::string;

// Include HAL types (CRGB)
#include "hal/types.h"

// Include HAL test implementations
#include "hal/test/test_platform.h"
#include "hal/test/platform.cpp"

// Define the driver config struct for testing
struct DriverConfigData {
	float gammaR = 1.0f;
	float gammaG = 1.0f;
	float gammaB = 1.0f;
	uint8_t floorR = 0;
	uint8_t floorG = 0;
	uint8_t floorB = 0;
};

// Global driver config instance (normally in driver_config.cpp)
DriverConfigData g_driverConfig;

// Gamma LUT arrays (normally in driver_config.cpp)
uint8_t g_gammaLutR[256];
uint8_t g_gammaLutG[256];
uint8_t g_gammaLutB[256];

// Include the function under test (after globals are defined)
// We inline the function here to avoid complex include dependencies
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

		// Apply floor cutoff: values at or below floor become 0
		g_gammaLutR[i] = (correctedR <= floorR) ? 0 : correctedR;
		g_gammaLutG[i] = (correctedG <= floorG) ? 0 : correctedG;
		g_gammaLutB[i] = (correctedB <= floorB) ? 0 : correctedB;
	}
}

void setUp(void) {
	// Reset to defaults before each test
	g_driverConfig.gammaR = 1.0f;
	g_driverConfig.gammaG = 1.0f;
	g_driverConfig.gammaB = 1.0f;
	g_driverConfig.floorR = 0;
	g_driverConfig.floorG = 0;
	g_driverConfig.floorB = 0;
}

void tearDown(void) {}

// =============================================================================
// Floor Cutoff Tests
// =============================================================================

void test_floor_zero_has_no_effect() {
	// With floor = 0 and gamma = 1.0, LUT should be identity (input = output)
	g_driverConfig.floorR = 0;
	g_driverConfig.floorG = 0;
	g_driverConfig.floorB = 0;
	rebuildGammaLUT();

	// Check a few values
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[0]);
	TEST_ASSERT_EQUAL_UINT8(1, g_gammaLutR[1]);
	TEST_ASSERT_EQUAL_UINT8(128, g_gammaLutR[128]);
	TEST_ASSERT_EQUAL_UINT8(255, g_gammaLutR[255]);
}

void test_floor_cutoff_red_only() {
	// Set red floor to 10 - values 0-10 should become 0, 11+ unchanged
	g_driverConfig.floorR = 10;
	g_driverConfig.floorG = 0;
	g_driverConfig.floorB = 0;
	rebuildGammaLUT();

	// Red channel: values at or below 10 become 0
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[0]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[5]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[10]);
	TEST_ASSERT_EQUAL_UINT8(11, g_gammaLutR[11]);  // Just above floor
	TEST_ASSERT_EQUAL_UINT8(128, g_gammaLutR[128]);
	TEST_ASSERT_EQUAL_UINT8(255, g_gammaLutR[255]);

	// Green and blue should be unaffected (floor = 0)
	TEST_ASSERT_EQUAL_UINT8(1, g_gammaLutG[1]);
	TEST_ASSERT_EQUAL_UINT8(10, g_gammaLutG[10]);
	TEST_ASSERT_EQUAL_UINT8(1, g_gammaLutB[1]);
	TEST_ASSERT_EQUAL_UINT8(10, g_gammaLutB[10]);
}

void test_floor_cutoff_all_channels() {
	// Set different floor values for each channel
	g_driverConfig.floorR = 5;
	g_driverConfig.floorG = 10;
	g_driverConfig.floorB = 15;
	rebuildGammaLUT();

	// Red: floor = 5
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[5]);
	TEST_ASSERT_EQUAL_UINT8(6, g_gammaLutR[6]);

	// Green: floor = 10
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutG[10]);
	TEST_ASSERT_EQUAL_UINT8(11, g_gammaLutG[11]);

	// Blue: floor = 15
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutB[15]);
	TEST_ASSERT_EQUAL_UINT8(16, g_gammaLutB[16]);
}

void test_floor_with_gamma_correction() {
	// With gamma = 2.0 and floor = 10, the gamma-corrected output
	// must be > 10 to not be cut off
	g_driverConfig.gammaR = 2.0f;
	g_driverConfig.floorR = 10;
	rebuildGammaLUT();

	// With gamma 2.0:
	// input 0 -> output 0 (below floor, stays 0)
	// input 50 -> (50/255)^2 * 255 ≈ 9.8 -> rounds to 10, which is AT floor -> 0
	// input 51 -> (51/255)^2 * 255 ≈ 10.2 -> rounds to 10, AT floor -> 0
	// input 52 -> (52/255)^2 * 255 ≈ 10.6 -> rounds to 11, ABOVE floor -> 11

	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[0]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[50]);  // gamma result ~10, at floor
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[51]);  // gamma result ~10, at floor

	// Higher inputs should pass through
	TEST_ASSERT_EQUAL_UINT8(255, g_gammaLutR[255]);
}

void test_floor_255_blacks_out_channel() {
	// Floor = 255 means only input 255 with gamma=1 would produce 255,
	// which equals floor, so it becomes 0. Everything is blacked out.
	g_driverConfig.floorR = 255;
	rebuildGammaLUT();

	// All values should be 0 (even 255, since 255 <= 255)
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[0]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[128]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[254]);
	TEST_ASSERT_EQUAL_UINT8(0, g_gammaLutR[255]);  // 255 <= 255, so 0
}

void test_floor_preserves_values_above() {
	// Values above floor should be unchanged (with gamma = 1.0)
	g_driverConfig.floorR = 40;
	rebuildGammaLUT();

	// Values above 40 should pass through unchanged
	TEST_ASSERT_EQUAL_UINT8(41, g_gammaLutR[41]);
	TEST_ASSERT_EQUAL_UINT8(100, g_gammaLutR[100]);
	TEST_ASSERT_EQUAL_UINT8(200, g_gammaLutR[200]);
	TEST_ASSERT_EQUAL_UINT8(255, g_gammaLutR[255]);
}

// =============================================================================
// Test Runner
// =============================================================================

int main(int argc, char **argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	RUN_TEST(test_floor_zero_has_no_effect);
	RUN_TEST(test_floor_cutoff_red_only);
	RUN_TEST(test_floor_cutoff_all_channels);
	RUN_TEST(test_floor_with_gamma_correction);
	RUN_TEST(test_floor_255_blacks_out_channel);
	RUN_TEST(test_floor_preserves_values_above);

	return UNITY_END();
}
