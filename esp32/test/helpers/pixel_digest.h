/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Pixel Digest Test Helpers
 *
 * Provides FNV-1a 64-bit hashing of LED buffers for snapshot testing,
 * plus property-based analysis helpers for behavioral invariant tests.
 *
 * USAGE: Before including this file, tests must define:
 *   - DriverConfigData struct with gamma/floor fields
 *   - g_driverConfig global instance
 *   - g_gammaLutR/G/B[256] arrays
 *   - rebuildGammaLUT() function
 *
 * See test_gamma_floor.cpp for the pattern.
 */

#pragma once

#include <cstdint>
#include <cstdio>
#include <cmath>
#include <unity.h>
#include "hal/types.h"
#include "graphics/matrix.h"
#include "effect_test_helpers.h"

namespace test_helpers {

// FNV-1a 64-bit constants
constexpr uint64_t FNV_OFFSET_BASIS = 14695981039346656037ULL;
constexpr uint64_t FNV_PRIME = 1099511628211ULL;

/**
 * Compute FNV-1a 64-bit hash of raw byte data
 */
inline uint64_t fnv1a64(const uint8_t* data, size_t length) {
	uint64_t hash = FNV_OFFSET_BASIS;
	for (size_t i = 0; i < length; i++) {
		hash ^= data[i];
		hash *= FNV_PRIME;
	}
	return hash;
}

/**
 * Compute FNV-1a 64-bit hash of LED buffer
 * Hashes the raw RGB bytes of the LED array
 */
inline uint64_t computeFrameDigest(const CRGB* leds, uint32_t count) {
	// CRGB is 3 bytes (r, g, b) - hash the raw memory
	return fnv1a64(reinterpret_cast<const uint8_t*>(leds), count * sizeof(CRGB));
}

/**
 * Compute FNV-1a 64-bit hash of Matrix LED buffer
 */
inline uint64_t computeFrameDigest(Matrix& matrix) {
	return computeFrameDigest(matrix.leds, matrix.size);
}

/**
 * Initialize gamma LUTs to identity for test reproducibility
 * Sets gamma=1.0 and floor=0 for all channels (no color correction)
 */
inline void initTestGammaLUT() {
	g_driverConfig.gammaR = 1.0f;
	g_driverConfig.gammaG = 1.0f;
	g_driverConfig.gammaB = 1.0f;
	g_driverConfig.floorR = 0;
	g_driverConfig.floorG = 0;
	g_driverConfig.floorB = 0;
	rebuildGammaLUT();
}

/**
 * Print digest for snapshot generation
 * Only prints when GENERATE_DIGESTS is defined
 */
inline void printDigest(const char* label, uint64_t digest) {
#ifdef GENERATE_DIGESTS
	printf("DIGEST: %s = 0x%016llXull\n", label, (unsigned long long)digest);
#else
	(void)label;
	(void)digest;
#endif
}

/**
 * Assert digest matches expected value with descriptive failure message
 */
inline void assertDigest(uint64_t expected, uint64_t actual, const char* frameName) {
#ifdef GENERATE_DIGESTS
	printDigest(frameName, actual);
	TEST_PASS();
#else
	char msg[128];
	snprintf(msg, sizeof(msg), "%s: expected 0x%016llX, got 0x%016llX",
	         frameName, (unsigned long long)expected, (unsigned long long)actual);
	TEST_ASSERT_EQUAL_HEX64_MESSAGE(expected, actual, msg);
#endif
}

/**
 * Frame properties for property-based invariant testing
 */
struct FrameProperties {
	int nonBlackPixels;
	BoundingBox boundingBox;
	uint64_t totalBrightness;
	uint8_t maxBrightness;
};

/**
 * Analyze frame properties from Matrix LED buffer
 * Returns pixel count, bounding box, brightness stats
 */
inline FrameProperties analyzeFrame(Matrix& matrix) {
	FrameProperties props = {};
	props.boundingBox = {
	    static_cast<int16_t>(matrix.width),   // minX starts at max
	    -1,                                    // maxX starts at min
	    static_cast<int16_t>(matrix.height),  // minY starts at max
	    -1,                                    // maxY starts at min
	    false                                  // valid
	};

	for (uint16_t y = 0; y < matrix.height; y++) {
		for (uint16_t x = 0; x < matrix.width; x++) {
			CRGB pixel = matrix.led(x, y);

			// Brightness stats
			props.totalBrightness += pixel.r + pixel.g + pixel.b;
			if (pixel.r > props.maxBrightness) props.maxBrightness = pixel.r;
			if (pixel.g > props.maxBrightness) props.maxBrightness = pixel.g;
			if (pixel.b > props.maxBrightness) props.maxBrightness = pixel.b;

			// Non-black pixel tracking
			if (pixel.r != 0 || pixel.g != 0 || pixel.b != 0) {
				props.nonBlackPixels++;

				// Update bounding box
				if (static_cast<int16_t>(x) < props.boundingBox.minX)
					props.boundingBox.minX = static_cast<int16_t>(x);
				if (static_cast<int16_t>(x) > props.boundingBox.maxX)
					props.boundingBox.maxX = static_cast<int16_t>(x);
				if (static_cast<int16_t>(y) < props.boundingBox.minY)
					props.boundingBox.minY = static_cast<int16_t>(y);
				if (static_cast<int16_t>(y) > props.boundingBox.maxY)
					props.boundingBox.maxY = static_cast<int16_t>(y);
				props.boundingBox.valid = true;
			}
		}
	}

	return props;
}

/**
 * Test configuration for multi-matrix testing
 */
struct TestConfig {
	const char* name;
	uint16_t width;
	uint16_t height;
	const char* layout;  // nullptr for default, "strip" for strips
};

/**
 * Standard test configurations covering strip, square matrix, and wide matrix
 */
constexpr TestConfig TEST_CONFIGS[] = {
    {"strip_300", 300, 1, "strip"},
    {"matrix_16x16", 16, 16, nullptr},
    {"matrix_96x8", 96, 8, nullptr},
};
constexpr size_t TEST_CONFIG_COUNT = sizeof(TEST_CONFIGS) / sizeof(TEST_CONFIGS[0]);

}  // namespace test_helpers
