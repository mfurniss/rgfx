/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for Bloom Utilities
 *
 * Tests the shared bloom rendering system including:
 * - Euclidean distance LUT accuracy
 * - bloomPercentToRadius conversion
 * - renderBloom for strips (1D) and matrices (2D)
 * - Circular bloom shape verification
 */

#include <unity.h>
#include <cstdint>
#include <cmath>

// HAL types (CRGB, etc.)
#include "hal/types.h"

// Include graphics
#include "graphics/canvas.h"
#include "graphics/canvas.cpp"

// Include bloom utilities
#include "effects/bloom_utils.h"
#include "effects/bloom_utils.cpp"

void setUp(void) {}
void tearDown(void) {}

// =============================================================================
// 1. Euclidean Distance LUT Tests
// =============================================================================

void test_lut_center_is_zero() {
	// Center of the 9x9 grid (dx=0, dy=0) should be 0
	TEST_ASSERT_EQUAL_UINT8(0, getEuclideanDist16(0, 0));
}

void test_lut_cardinal_directions() {
	// Distance 1 in cardinal directions = 16 (1 * 16)
	TEST_ASSERT_EQUAL_UINT8(16, getEuclideanDist16(1, 0));
	TEST_ASSERT_EQUAL_UINT8(16, getEuclideanDist16(-1, 0));
	TEST_ASSERT_EQUAL_UINT8(16, getEuclideanDist16(0, 1));
	TEST_ASSERT_EQUAL_UINT8(16, getEuclideanDist16(0, -1));

	// Distance 2 in cardinal directions = 32 (2 * 16)
	TEST_ASSERT_EQUAL_UINT8(32, getEuclideanDist16(2, 0));
	TEST_ASSERT_EQUAL_UINT8(32, getEuclideanDist16(0, 2));
}

void test_lut_diagonal_directions() {
	// Distance sqrt(2) ≈ 1.414 * 16 ≈ 23
	TEST_ASSERT_EQUAL_UINT8(23, getEuclideanDist16(1, 1));
	TEST_ASSERT_EQUAL_UINT8(23, getEuclideanDist16(-1, -1));
	TEST_ASSERT_EQUAL_UINT8(23, getEuclideanDist16(1, -1));
	TEST_ASSERT_EQUAL_UINT8(23, getEuclideanDist16(-1, 1));

	// Distance sqrt(8) ≈ 2.828 * 16 ≈ 45
	TEST_ASSERT_EQUAL_UINT8(45, getEuclideanDist16(2, 2));
}

void test_lut_symmetry() {
	// LUT should be symmetric in all quadrants
	for (int8_t dy = -4; dy <= 4; dy++) {
		for (int8_t dx = -4; dx <= 4; dx++) {
			uint8_t d1 = getEuclideanDist16(dx, dy);
			uint8_t d2 = getEuclideanDist16(-dx, dy);
			uint8_t d3 = getEuclideanDist16(dx, -dy);
			uint8_t d4 = getEuclideanDist16(-dx, -dy);
			TEST_ASSERT_EQUAL_UINT8(d1, d2);
			TEST_ASSERT_EQUAL_UINT8(d1, d3);
			TEST_ASSERT_EQUAL_UINT8(d1, d4);
		}
	}
}

void test_lut_accuracy() {
	// Verify LUT values against computed Euclidean distances
	// Allow tolerance of 1 due to rounding
	for (int8_t dy = -4; dy <= 4; dy++) {
		for (int8_t dx = -4; dx <= 4; dx++) {
			float expected = sqrtf(static_cast<float>(dx * dx + dy * dy)) * 16.0f;
			uint8_t actual = getEuclideanDist16(dx, dy);
			int diff = abs(static_cast<int>(actual) - static_cast<int>(roundf(expected)));
			TEST_ASSERT_TRUE_MESSAGE(diff <= 1, "LUT value differs from computed by more than 1");
		}
	}
}

void test_lut_corners() {
	// Corner values at maximum distance
	// sqrt(32) * 16 ≈ 90.5 -> 91
	TEST_ASSERT_EQUAL_UINT8(91, getEuclideanDist16(-4, -4));
	TEST_ASSERT_EQUAL_UINT8(91, getEuclideanDist16(4, -4));
	TEST_ASSERT_EQUAL_UINT8(91, getEuclideanDist16(-4, 4));
	TEST_ASSERT_EQUAL_UINT8(91, getEuclideanDist16(4, 4));
}

// =============================================================================
// 2. bloomPercentToRadius Tests
// =============================================================================

void test_bloom_percent_zero() {
	TEST_ASSERT_EQUAL_UINT8(0, bloomPercentToRadius(0));
}

void test_bloom_percent_small_nonzero() {
	// Small non-zero values should round up to 1
	TEST_ASSERT_EQUAL_UINT8(1, bloomPercentToRadius(1));
	TEST_ASSERT_EQUAL_UINT8(1, bloomPercentToRadius(10));
	TEST_ASSERT_EQUAL_UINT8(1, bloomPercentToRadius(24));
}

void test_bloom_percent_thresholds() {
	// 25% -> radius 1
	TEST_ASSERT_EQUAL_UINT8(1, bloomPercentToRadius(25));

	// 50% -> radius 2
	TEST_ASSERT_EQUAL_UINT8(2, bloomPercentToRadius(50));

	// 75% -> radius 3
	TEST_ASSERT_EQUAL_UINT8(3, bloomPercentToRadius(75));

	// 100% -> radius 4
	TEST_ASSERT_EQUAL_UINT8(4, bloomPercentToRadius(100));
}

void test_bloom_percent_boundary_values() {
	// Test values just below thresholds
	TEST_ASSERT_EQUAL_UINT8(1, bloomPercentToRadius(49));  // Just below 50%
	TEST_ASSERT_EQUAL_UINT8(2, bloomPercentToRadius(74));  // Just below 75%
	TEST_ASSERT_EQUAL_UINT8(3, bloomPercentToRadius(99));  // Just below 100%
}

// =============================================================================
// 3. renderBloom Basic Tests
// =============================================================================

void test_render_bloom_radius_zero_no_effect() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 0,
		.intensity = 127,
		.bloom = 50,
	};

	renderBloom(canvas, 16, 16, CRGB(255, 0, 0), config, false);

	// With radius 0, nothing should be rendered
	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			CRGB p = canvas.getPixel(x, y);
			TEST_ASSERT_EQUAL_UINT8(0, p.r);
			TEST_ASSERT_EQUAL_UINT8(0, p.g);
			TEST_ASSERT_EQUAL_UINT8(0, p.b);
		}
	}
}

void test_render_bloom_creates_pixels() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	// Center at (16, 16) in canvas coords
	renderBloom(canvas, 16, 16, CRGB(255, 0, 0), config, false);

	// Count non-black pixels
	int nonBlack = 0;
	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > 0 || p.g > 0 || p.b > 0) {
				nonBlack++;
			}
		}
	}

	TEST_ASSERT_TRUE(nonBlack > 0);
}

void test_render_bloom_uses_correct_color() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 1,
		.intensity = 255,
		.bloom = 100,
	};

	// Red bloom
	renderBloom(canvas, 16, 16, CRGB(255, 0, 0), config, false);

	// Check that rendered pixels have red component but not green/blue
	bool hasRed = false;
	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > 0) {
				hasRed = true;
				TEST_ASSERT_EQUAL_UINT8(0, p.g);
				TEST_ASSERT_EQUAL_UINT8(0, p.b);
			}
		}
	}
	TEST_ASSERT_TRUE(hasRed);
}

// =============================================================================
// 4. Strip (1D) Bloom Tests
// =============================================================================

void test_render_bloom_strip_horizontal_only() {
	// Strip canvas: width=64, height=1 (canvas coords, so 16 LEDs)
	Canvas canvas(64, 1);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100
	};

	// Center at LED 8 (canvas x=32)
	renderBloom(canvas, 32, 0, CRGB(0, 255, 0), config, true);

	// Verify bloom spreads horizontally
	// Check pixels at x=24 (dx=-2), x=28 (dx=-1), x=36 (dx=+1), x=40 (dx=+2)
	CRGB left2 = canvas.getPixel(24, 0);
	CRGB left1 = canvas.getPixel(28, 0);
	CRGB right1 = canvas.getPixel(36, 0);
	CRGB right2 = canvas.getPixel(40, 0);

	TEST_ASSERT_TRUE(left1.g > 0);
	TEST_ASSERT_TRUE(right1.g > 0);
	TEST_ASSERT_TRUE(left2.g > 0);
	TEST_ASSERT_TRUE(right2.g > 0);

	// Closer pixels should be brighter
	TEST_ASSERT_TRUE(left1.g >= left2.g);
	TEST_ASSERT_TRUE(right1.g >= right2.g);
}

void test_render_bloom_strip_symmetric() {
	Canvas canvas(64, 1);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	renderBloom(canvas, 32, 0, CRGB(255, 255, 255), config, true);

	// Bloom should be symmetric left/right
	for (int dx = 1; dx <= 2; dx++) {
		CRGB left = canvas.getPixel(32 - dx * 4, 0);
		CRGB right = canvas.getPixel(32 + dx * 4, 0);
		TEST_ASSERT_EQUAL_UINT8(left.r, right.r);
		TEST_ASSERT_EQUAL_UINT8(left.g, right.g);
		TEST_ASSERT_EQUAL_UINT8(left.b, right.b);
	}
}

void test_render_bloom_strip_respects_bounds_left() {
	Canvas canvas(64, 1);
	canvas.clear();

	BloomConfig config = {
		.radius = 3,
		.intensity = 127,
		.bloom = 100,
	};

	// Center near left edge (LED 1, canvas x=4)
	renderBloom(canvas, 4, 0, CRGB(255, 0, 0), config, true);

	// Should not crash and should render what fits
	// Check that at least some pixels are rendered on the right side
	CRGB right1 = canvas.getPixel(8, 0);
	TEST_ASSERT_TRUE(right1.r > 0);
}

void test_render_bloom_strip_respects_bounds_right() {
	Canvas canvas(64, 1);
	canvas.clear();

	BloomConfig config = {
		.radius = 3,
		.intensity = 127,
		.bloom = 100,
	};

	// Center near right edge (LED 15, canvas x=60)
	renderBloom(canvas, 60, 0, CRGB(255, 0, 0), config, true);

	// Should not crash and should render what fits
	CRGB left1 = canvas.getPixel(56, 0);
	TEST_ASSERT_TRUE(left1.r > 0);
}

// =============================================================================
// 5. Matrix (2D) Bloom Tests
// =============================================================================

void test_render_bloom_matrix_2d_spread() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	// Center at (16, 16)
	renderBloom(canvas, 16, 16, CRGB(0, 0, 255), config, false);

	// Verify bloom spreads in all cardinal directions
	CRGB up = canvas.getPixel(16, 12);     // dy=-1 (canvas y=16-4=12)
	CRGB down = canvas.getPixel(16, 20);   // dy=+1 (canvas y=16+4=20)
	CRGB left = canvas.getPixel(12, 16);   // dx=-1
	CRGB right = canvas.getPixel(20, 16);  // dx=+1

	TEST_ASSERT_TRUE(up.b > 0);
	TEST_ASSERT_TRUE(down.b > 0);
	TEST_ASSERT_TRUE(left.b > 0);
	TEST_ASSERT_TRUE(right.b > 0);
}

void test_render_bloom_matrix_diagonal_spread() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	renderBloom(canvas, 16, 16, CRGB(255, 255, 0), config, false);

	// Verify bloom spreads diagonally
	CRGB upleft = canvas.getPixel(12, 12);
	CRGB upright = canvas.getPixel(20, 12);
	CRGB downleft = canvas.getPixel(12, 20);
	CRGB downright = canvas.getPixel(20, 20);

	TEST_ASSERT_TRUE(upleft.r > 0);
	TEST_ASSERT_TRUE(upright.r > 0);
	TEST_ASSERT_TRUE(downleft.r > 0);
	TEST_ASSERT_TRUE(downright.r > 0);
}

void test_render_bloom_matrix_respects_bounds() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 4,
		.intensity = 127,
		.bloom = 100,
	};

	// Center near corner (4, 4)
	renderBloom(canvas, 4, 4, CRGB(255, 0, 255), config, false);

	// Should not crash and should render what fits
	// At least some bloom should be visible
	int nonBlack = 0;
	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > 0 || p.g > 0 || p.b > 0) nonBlack++;
		}
	}
	TEST_ASSERT_TRUE(nonBlack > 0);
}

// =============================================================================
// 6. Circular Shape Tests
// =============================================================================

void test_circular_round_shape() {
	Canvas canvas(64, 64);
	canvas.clear();

	BloomConfig config = {
		.radius = 4,
		.intensity = 127,
		.bloom = 100
	};

	// Center at (32, 32)
	renderBloom(canvas, 32, 32, CRGB(255, 255, 255), config, false);

	// Euclidean distance creates circular shape
	// At (dx=3, dy=2): distance ≈ 3.6, should be included
	// At (dx=4, dy=0): distance = 4, should be included
	// At (dx=3, dy=3): distance ≈ 4.24, should be excluded

	CRGB edge1 = canvas.getPixel(44, 40);  // dx=3, dy=2
	CRGB edge2 = canvas.getPixel(48, 32);  // dx=4, dy=0
	CRGB outside = canvas.getPixel(44, 44); // dx=3, dy=3 (distance > 4)

	TEST_ASSERT_TRUE(edge1.r > 0);
	TEST_ASSERT_TRUE(edge2.r > 0);
	TEST_ASSERT_TRUE(outside.r == 0 && outside.g == 0 && outside.b == 0);
}

// =============================================================================
// 7. Intensity and Alpha Tests
// =============================================================================

void test_bloom_intensity_affects_brightness() {
	Canvas lowCanvas(32, 32);
	Canvas highCanvas(32, 32);
	lowCanvas.clear();
	highCanvas.clear();

	BloomConfig lowConfig = {
		.radius = 2,
		.intensity = 50,
		.bloom = 100,
	};

	BloomConfig highConfig = {
		.radius = 2,
		.intensity = 200,
		.bloom = 100,
	};

	renderBloom(lowCanvas, 16, 16, CRGB(255, 255, 255), lowConfig, false);
	renderBloom(highCanvas, 16, 16, CRGB(255, 255, 255), highConfig, false);

	// High intensity should produce brighter pixels
	CRGB lowPixel = lowCanvas.getPixel(20, 16);
	CRGB highPixel = highCanvas.getPixel(20, 16);

	TEST_ASSERT_TRUE(highPixel.r > lowPixel.r);
}

void test_bloom_percent_affects_brightness() {
	Canvas lowCanvas(32, 32);
	Canvas highCanvas(32, 32);
	lowCanvas.clear();
	highCanvas.clear();

	BloomConfig lowConfig = {
		.radius = 2,
		.intensity = 127,
		.bloom = 25,
	};

	BloomConfig highConfig = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	renderBloom(lowCanvas, 16, 16, CRGB(255, 255, 255), lowConfig, false);
	renderBloom(highCanvas, 16, 16, CRGB(255, 255, 255), highConfig, false);

	// Higher bloom percentage should produce brighter pixels
	CRGB lowPixel = lowCanvas.getPixel(20, 16);
	CRGB highPixel = highCanvas.getPixel(20, 16);

	TEST_ASSERT_TRUE(highPixel.r > lowPixel.r);
}

void test_bloom_falloff_with_distance() {
	Canvas canvas(64, 64);
	canvas.clear();

	BloomConfig config = {
		.radius = 4,
		.intensity = 255,
		.bloom = 100,
	};

	renderBloom(canvas, 32, 32, CRGB(255, 255, 255), config, false);

	// Pixels closer to center should be brighter
	CRGB dist1 = canvas.getPixel(36, 32);  // dx=1
	CRGB dist2 = canvas.getPixel(40, 32);  // dx=2
	CRGB dist3 = canvas.getPixel(44, 32);  // dx=3
	CRGB dist4 = canvas.getPixel(48, 32);  // dx=4

	TEST_ASSERT_TRUE(dist1.r >= dist2.r);
	TEST_ASSERT_TRUE(dist2.r >= dist3.r);
	TEST_ASSERT_TRUE(dist3.r >= dist4.r);
}

// =============================================================================
// 8. Additive Blending Tests
// =============================================================================

void test_bloom_additive_blending() {
	Canvas canvas(32, 32);

	// Fill with existing color
	canvas.fill(CRGB(50, 0, 0));

	BloomConfig config = {
		.radius = 1,
		.intensity = 127,
		.bloom = 100,
	};

	renderBloom(canvas, 16, 16, CRGB(0, 100, 0), config, false);

	// Adjacent pixel should have both red (from fill) and green (from bloom)
	CRGB pixel = canvas.getPixel(20, 16);
	TEST_ASSERT_TRUE(pixel.r >= 50);  // Should keep existing red
	TEST_ASSERT_TRUE(pixel.g > 0);    // Should add green from bloom
}

void test_bloom_additive_saturates_at_255() {
	Canvas canvas(32, 32);

	// Fill with near-max color
	canvas.fill(CRGB(200, 200, 200));

	BloomConfig config = {
		.radius = 1,
		.intensity = 255,
		.bloom = 100,
	};

	renderBloom(canvas, 16, 16, CRGB(255, 255, 255), config, false);

	// Should saturate at 255, not overflow
	CRGB pixel = canvas.getPixel(20, 16);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

// =============================================================================
// 9. Edge Cases
// =============================================================================

void test_bloom_at_origin() {
	Canvas canvas(32, 32);
	canvas.clear();

	BloomConfig config = {
		.radius = 2,
		.intensity = 127,
		.bloom = 100,
	};

	// Center at origin
	renderBloom(canvas, 0, 0, CRGB(255, 0, 0), config, false);

	// Should render what fits (only positive dx/dy)
	CRGB right = canvas.getPixel(4, 0);
	CRGB down = canvas.getPixel(0, 4);
	TEST_ASSERT_TRUE(right.r > 0);
	TEST_ASSERT_TRUE(down.r > 0);
}

void test_bloom_all_radii() {
	// Test all valid radii (0-4)
	for (uint8_t radius = 0; radius <= 4; radius++) {
		Canvas canvas(64, 64);
		canvas.clear();

		BloomConfig config = {
			.radius = radius,
			.intensity = 127,
			.bloom = 100,
			};

		renderBloom(canvas, 32, 32, CRGB(255, 255, 255), config, false);

		if (radius == 0) {
			// No pixels should be rendered
			int count = 0;
			for (uint16_t y = 0; y < 64; y++) {
				for (uint16_t x = 0; x < 64; x++) {
					CRGB p = canvas.getPixel(x, y);
					if (p.r > 0) count++;
				}
			}
			TEST_ASSERT_EQUAL(0, count);
		} else {
			// Some pixels should be rendered
			int count = 0;
			for (uint16_t y = 0; y < 64; y++) {
				for (uint16_t x = 0; x < 64; x++) {
					CRGB p = canvas.getPixel(x, y);
					if (p.r > 0) count++;
				}
			}
			TEST_ASSERT_TRUE(count > 0);
		}
	}
}

void test_bloom_small_canvas() {
	// 2x2 LED canvas (8x8 in canvas coords)
	Canvas canvas(8, 8);
	canvas.clear();

	BloomConfig config = {
		.radius = 4,
		.intensity = 127,
		.bloom = 100,
	};

	// Center at middle
	renderBloom(canvas, 4, 4, CRGB(255, 255, 255), config, false);

	// Should not crash and render what fits
	TEST_PASS();
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;
	UNITY_BEGIN();

	// 1. Euclidean Distance LUT Tests
	RUN_TEST(test_lut_center_is_zero);
	RUN_TEST(test_lut_cardinal_directions);
	RUN_TEST(test_lut_diagonal_directions);
	RUN_TEST(test_lut_symmetry);
	RUN_TEST(test_lut_accuracy);
	RUN_TEST(test_lut_corners);

	// 2. bloomPercentToRadius Tests
	RUN_TEST(test_bloom_percent_zero);
	RUN_TEST(test_bloom_percent_small_nonzero);
	RUN_TEST(test_bloom_percent_thresholds);
	RUN_TEST(test_bloom_percent_boundary_values);

	// 3. renderBloom Basic Tests
	RUN_TEST(test_render_bloom_radius_zero_no_effect);
	RUN_TEST(test_render_bloom_creates_pixels);
	RUN_TEST(test_render_bloom_uses_correct_color);

	// 4. Strip (1D) Bloom Tests
	RUN_TEST(test_render_bloom_strip_horizontal_only);
	RUN_TEST(test_render_bloom_strip_symmetric);
	RUN_TEST(test_render_bloom_strip_respects_bounds_left);
	RUN_TEST(test_render_bloom_strip_respects_bounds_right);

	// 5. Matrix (2D) Bloom Tests
	RUN_TEST(test_render_bloom_matrix_2d_spread);
	RUN_TEST(test_render_bloom_matrix_diagonal_spread);
	RUN_TEST(test_render_bloom_matrix_respects_bounds);

	// 6. Circular Shape Tests
	RUN_TEST(test_circular_round_shape);

	// 7. Intensity and Alpha Tests
	RUN_TEST(test_bloom_intensity_affects_brightness);
	RUN_TEST(test_bloom_percent_affects_brightness);
	RUN_TEST(test_bloom_falloff_with_distance);

	// 8. Additive Blending Tests
	RUN_TEST(test_bloom_additive_blending);
	RUN_TEST(test_bloom_additive_saturates_at_255);

	// 9. Edge Cases
	RUN_TEST(test_bloom_at_origin);
	RUN_TEST(test_bloom_all_radii);
	RUN_TEST(test_bloom_small_canvas);

	return UNITY_END();
}
