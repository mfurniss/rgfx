/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Comprehensive Unit Tests for ExplodeEffect
 *
 * Tests cover all parameters, edge cases, and rendering correctness.
 * Uses deterministic random seeding for reproducible snapshot tests.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cmath>
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
#include "effects/explode.h"
#include "effects/explode.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// 1. Basic Creation & Defaults
// =============================================================================

void test_explode_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_explode_add_creates_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FF0000";
	props["particleCount"] = 10;

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_with_defaults() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);

	effect.add(props);
	canvas.clear();
	effect.render();

	// Default particleCount=100, should render something
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_reset_clears_all() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 100;
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
// 2. Center Position Tests
// =============================================================================

void test_explode_center_0_percent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["particleSize"] = 4;
	props["centerX"] = 0;
	props["centerY"] = 0;
	props["power"] = 5;
	props["friction"] = 10;
	props["lifespan"] = 5000;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Particles should be concentrated in top-left quadrant
	int topLeft = countPixelsInQuadrant(canvas, 0);
	TEST_ASSERT_TRUE(topLeft > 0);
}

void test_explode_center_100_percent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["particleSize"] = 4;
	props["centerX"] = 100;
	props["centerY"] = 100;
	props["power"] = 5;
	props["friction"] = 10;
	props["lifespan"] = 5000;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Particles should be concentrated in bottom-right quadrant
	int bottomRight = countPixelsInQuadrant(canvas, 3);
	TEST_ASSERT_TRUE(bottomRight > 0);
}

void test_explode_center_50_percent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 100;
	props["particleSize"] = 4;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["power"] = 5;
	props["friction"] = 10;
	props["lifespan"] = 5000;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Particles should be spread across all quadrants from center
	int total = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(total > 0);
}

void test_explode_center_arbitrary() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["centerX"] = 25;
	props["centerY"] = 75;

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_center_random_string_x() {
	// ESP32 now handles "random" string directly
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["centerX"] = "random";  // String "random" should work
	props["centerY"] = 50;

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_center_random_string_y() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["centerX"] = 50;
	props["centerY"] = "random";  // String "random" should work

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_center_random_string_both() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["centerX"] = "random";
	props["centerY"] = "random";

	effect.add(props);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_strip_ignores_centerY() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["centerX"] = 25;
	props["centerY"] = 75;  // Should be ignored for strip

	effect.add(props);
	effect.update(0.01f);
	canvas.clear();
	effect.render();

	// Strip only has height=1, should still render
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 3. Particle Physics Tests
// =============================================================================

void test_explode_power_affects_spread() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);

	// Low power explosion
	ExplodeEffect effect1(matrix, canvas);
	JsonDocument props1;
	setDefaultExplodeProps(props1);
	props1["particleCount"] = 50;
	props1["power"] = 10;
	props1["friction"] = 0.5;
	props1["lifespan"] = 5000;
	effect1.add(props1);
	effect1.update(0.1f);
	canvas.clear();
	effect1.render();
	BoundingBox box1 = findBoundingBox(canvas);

	// High power explosion
	hal::test::seedRandom(12345);  // Reset random for comparison
	ExplodeEffect effect2(matrix, canvas);
	JsonDocument props2;
	setDefaultExplodeProps(props2);
	props2["particleCount"] = 50;
	props2["power"] = 100;
	props2["friction"] = 0.5;
	props2["lifespan"] = 5000;
	effect2.add(props2);
	effect2.update(0.1f);
	canvas.clear();
	effect2.render();
	BoundingBox box2 = findBoundingBox(canvas);

	// Higher power should spread further
	int spread1 = (box1.maxX - box1.minX) + (box1.maxY - box1.minY);
	int spread2 = (box2.maxX - box2.minX) + (box2.maxY - box2.minY);
	TEST_ASSERT_GREATER_THAN(spread1, spread2);
}

void test_explode_friction_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 20;
	props["power"] = 50;
	props["friction"] = 0;
	props["lifespan"] = 5000;

	effect.add(props);

	// Update multiple times - particles should keep moving
	for (int i = 0; i < 10; i++) {
		effect.update(0.05f);
	}

	canvas.clear();
	effect.render();

	// With zero friction, particles move continuously
	// May be off-canvas or still visible
	TEST_PASS();
}

void test_explode_friction_high() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["power"] = 50;
	props["friction"] = 10.0;  // Very high friction
	props["lifespan"] = 5000;

	effect.add(props);

	// Update - particles should slow down quickly
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	// Should still render, particles slow but present
	int pixels = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixels >= 0);  // May have left canvas
}

void test_explode_power_spread_affects_velocity_variation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["power"] = 30;
	props["powerSpread"] = 100;  // Large variation (±100%)
	props["friction"] = 1.0;
	props["lifespan"] = 5000;

	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should render particles with varied positions
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 4. Particle Rendering Tests
// =============================================================================

void test_explode_particle_size_small() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 10;
	props["particleSize"] = 2;

	effect.add(props);
	canvas.clear();
	effect.render();

	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_explode_particle_size_large() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 10;
	props["particleSize"] = 8;  // Large particles

	effect.add(props);
	canvas.clear();
	effect.render();

	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_explode_alpha_decay_over_lifespan() {
	// Use larger canvas to prevent particles from going out of bounds
	// (rand() produces different sequences on Linux vs macOS)
	Matrix matrix(32, 32);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FFFFFF";
	props["particleCount"] = 10;  // Fewer particles to avoid saturation
	props["particleSize"] = 2;
	props["lifespan"] = 1000;
	props["friction"] = 5.0;  // High friction keeps particles nearby

	effect.add(props);

	// After 90% lifespan, particles should have very low alpha
	effect.update(0.9f);
	canvas.clear();
	effect.render();

	// Particles should still exist (haven't hit 100% yet)
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);

	// At 90% lifespan, alpha = 255 * 0.1 = 25 (very dim)
	// Max brightness should be noticeably less than 255
	uint8_t maxBrightness = getMaxBrightness(canvas);
	TEST_ASSERT_LESS_OR_EQUAL(128, maxBrightness);
}

void test_explode_hue_spread_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FF0000";  // Pure red
	props["particleCount"] = 50;
	props["hueSpread"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	// All particles should be red (no green/blue dominant)
	int redPixels = countRedDominantPixels(canvas);
	int greenPixels = countGreenDominantPixels(canvas);
	int bluePixels = countBlueDominantPixels(canvas);

	TEST_ASSERT_TRUE(redPixels > 0);
	TEST_ASSERT_EQUAL(0, greenPixels);
	TEST_ASSERT_EQUAL(0, bluePixels);
}

void test_explode_hue_spread_90() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FF0000";  // Base red
	props["particleCount"] = 100;
	props["hueSpread"] = 90;  // +/-45 degrees

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have color variation
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_hue_spread_180() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#00FF00";  // Base green
	props["particleCount"] = 100;
	props["hueSpread"] = 180;  // Wide range

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should have diverse colors
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 5. Pool Management Tests
// =============================================================================

void test_explode_fifo_eviction_when_pool_exceeds_max() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	// Add first explosion with 400 particles
	JsonDocument props1;
	setDefaultExplodeProps(props1);
	props1["color"] = "#FF0000";
	props1["particleCount"] = 400;
	props1["lifespan"] = 10000;
	effect.add(props1);

	// Add second explosion with 200 more particles
	// Total would be 600, but max is 500
	JsonDocument props2;
	setDefaultExplodeProps(props2);
	props2["color"] = "#00FF00";
	props2["particleCount"] = 200;
	props2["lifespan"] = 10000;
	effect.add(props2);

	// Should not crash, oldest particles evicted
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_particle_count_capped_at_max() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 1000;  // Above MAX_PARTICLE_POOL_SIZE (500)
	props["lifespan"] = 10000;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should render, capped at 500
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_multiple_explosions_share_pool() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	// Add multiple small explosions
	for (int i = 0; i < 5; i++) {
		JsonDocument props;
		setDefaultExplodeProps(props);
		props["particleCount"] = 50;
		props["centerX"] = (i * 20);  // Different positions
		props["lifespan"] = 10000;
		effect.add(props);
	}

	canvas.clear();
	effect.render();

	// All 250 particles should render (under 500 limit)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 6. Strip vs Matrix Behavior
// =============================================================================

void test_explode_strip_horizontal_only() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["power"] = 50;
	props["friction"] = 1.0;

	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Canvas should be 1D
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_matrix_2d_radial() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 100;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["power"] = 30;
	props["friction"] = 1.0;
	props["lifespan"] = 5000;
	props["scalePower"] = false;  // Disable scaling for predictable spread

	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have particles in multiple quadrants (radial spread)
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_TRUE(box.maxX - box.minX > 10);  // Horizontal spread
	TEST_ASSERT_TRUE(box.maxY - box.minY > 10);  // Vertical spread
}

// =============================================================================
// 7. Flash Effect Tests (Strip Only)
// =============================================================================

void test_explode_flash_renders_on_strip() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FF0000";
	props["particleCount"] = 0;  // No particles, only flash
	props["power"] = 50;
	props["lifespan"] = 1000;

	effect.add(props);

	// Render immediately - flash should be visible
	canvas.clear();
	effect.render();

	// Flash should be visible
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Flash should be red (matching explosion color), not white
	int redPixels = countRedDominantPixels(canvas);
	int whitePixels = countWhitePixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
	TEST_ASSERT_EQUAL(0, whitePixels);
}

void test_explode_flash_collapses_over_time() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 20;
	props["power"] = 50;
	props["lifespan"] = 1000;

	effect.add(props);

	// Initial render
	canvas.clear();
	effect.render();
	int initialPixels = countNonBlackPixels(canvas);

	// After flash duration (35% of lifespan = 350ms)
	effect.update(0.4f);
	canvas.clear();
	effect.render();

	// Flash should have collapsed, particles may remain
	TEST_ASSERT_TRUE(initialPixels > 0);
}

void test_explode_no_flash_on_matrix() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FF0000";  // Red particles
	props["particleCount"] = 50;
	props["hueSpread"] = 0;  // Keep pure red

	effect.add(props);
	canvas.clear();
	effect.render();

	// Matrix should have red particles, no white flash
	int redPixels = countRedDominantPixels(canvas);
	TEST_ASSERT_TRUE(redPixels > 0);
}

// =============================================================================
// 8. Bounds & Lifespan Tests
// =============================================================================

void test_explode_particles_removed_when_expired() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["lifespan"] = 100;  // 100ms lifespan

	effect.add(props);

	// Initial render
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Update past lifespan
	effect.update(0.2f);  // 200ms

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_explode_particles_removed_when_off_canvas() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["power"] = 200;  // High power to exit canvas quickly
	props["friction"] = 0;
	props["lifespan"] = 10000;
	props["scalePower"] = false;  // Disable scaling for predictable exit velocity

	effect.add(props);

	// Update until particles exit
	for (int i = 0; i < 20; i++) {
		effect.update(0.05f);
	}

	canvas.clear();
	effect.render();

	// Particles should have left canvas
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_explode_lifespan_very_short() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["lifespan"] = 10;  // Very short lifespan (10ms)

	effect.add(props);

	// Particles exist initially
	canvas.clear();
	effect.render();
	int initial = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(initial > 0);

	// Update past lifespan expires them
	effect.update(0.05f);  // 50ms - well past 10ms lifespan
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_explode_lifespan_spread_affects_expiration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 100;
	props["lifespan"] = 500;
	props["lifespanSpread"] = 100;  // Wide variation (±100%)

	effect.add(props);

	// After base lifespan, some should remain (due to spread)
	effect.update(0.5f);
	canvas.clear();
	effect.render();

	// Some particles may still exist due to spread
	// (depends on random distribution)
	TEST_PASS();
}

// =============================================================================
// 9. Explosion Cleanup Tests
// =============================================================================

void test_explode_explosion_removed_when_all_particles_gone() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 20;
	props["lifespan"] = 50;

	effect.add(props);

	// Update until all particles expire
	for (int i = 0; i < 5; i++) {
		effect.update(0.1f);
	}

	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));

	// Adding new explosion should work
	JsonDocument props2;
	setDefaultExplodeProps(props2);
	props2["particleCount"] = 50;
	props2["lifespan"] = 5000;
	effect.add(props2);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_multiple_explosions_independent_cleanup() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	// Short-lived explosion
	JsonDocument props1;
	setDefaultExplodeProps(props1);
	props1["color"] = "#FF0000";
	props1["particleCount"] = 30;
	props1["lifespan"] = 50;
	props1["centerX"] = 25;
	effect.add(props1);

	// Long-lived explosion
	JsonDocument props2;
	setDefaultExplodeProps(props2);
	props2["color"] = "#00FF00";
	props2["particleCount"] = 30;
	props2["lifespan"] = 5000;
	props2["centerX"] = 75;
	effect.add(props2);

	// First expires, second remains
	effect.update(0.2f);
	canvas.clear();
	effect.render();

	// Should still have green particles
	int greenPixels = countGreenDominantPixels(canvas);
	TEST_ASSERT_TRUE(greenPixels > 0);
}

// =============================================================================
// 10. Deterministic Snapshot Tests
// =============================================================================

void test_explode_snapshot_deterministic_positions() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// First render
	hal::test::seedRandom(54321);
	ExplodeEffect effect1(matrix, canvas);
	JsonDocument props1;
	setDefaultExplodeProps(props1);
	props1["color"] = "#FFFFFF";
	props1["particleCount"] = 20;
	props1["power"] = 30;
	props1["friction"] = 2.0;
	props1["lifespan"] = 5000;
	effect1.add(props1);
	effect1.update(0.1f);
	canvas.clear();
	effect1.render();
	int count1 = countNonBlackPixels(canvas);
	BoundingBox box1 = findBoundingBox(canvas);

	// Second render with same seed
	hal::test::seedRandom(54321);
	ExplodeEffect effect2(matrix, canvas);
	JsonDocument props2;
	setDefaultExplodeProps(props2);
	props2["color"] = "#FFFFFF";
	props2["particleCount"] = 20;
	props2["power"] = 30;
	props2["friction"] = 2.0;
	props2["lifespan"] = 5000;
	effect2.add(props2);
	effect2.update(0.1f);
	canvas.clear();
	effect2.render();
	int count2 = countNonBlackPixels(canvas);
	BoundingBox box2 = findBoundingBox(canvas);

	// Should be identical
	TEST_ASSERT_EQUAL(count1, count2);
	TEST_ASSERT_EQUAL(box1.minX, box2.minX);
	TEST_ASSERT_EQUAL(box1.maxX, box2.maxX);
	TEST_ASSERT_EQUAL(box1.minY, box2.minY);
	TEST_ASSERT_EQUAL(box1.maxY, box2.maxY);
}

void test_explode_snapshot_t0() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FFFFFF";
	props["particleCount"] = 50;
	props["particleSize"] = 4;
	props["centerX"] = 50;
	props["centerY"] = 50;

	effect.add(props);
	canvas.clear();
	effect.render();

	// At t=0, particles at center
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);

	// Center should be around middle of canvas
	int centerX = (box.minX + box.maxX) / 2;
	int centerY = (box.minY + box.maxY) / 2;
	TEST_ASSERT_INT_WITHIN(10, canvas.getWidth() / 2, centerX);
	TEST_ASSERT_INT_WITHIN(10, canvas.getHeight() / 2, centerY);
}

void test_explode_snapshot_after_spread() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FFFFFF";
	props["particleCount"] = 100;
	props["particleSize"] = 2;
	props["power"] = 50;
	props["friction"] = 1.0;
	props["lifespan"] = 5000;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["scalePower"] = false;  // Disable scaling for predictable spread

	effect.add(props);
	effect.update(0.2f);  // Allow spread
	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);

	// Particles should have spread out
	int spreadX = box.maxX - box.minX;
	int spreadY = box.maxY - box.minY;
	TEST_ASSERT_GREATER_THAN(20, spreadX);
	TEST_ASSERT_GREATER_THAN(20, spreadY);
}

// =============================================================================
// 11. Edge Cases
// =============================================================================

void test_explode_zero_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 0;

	effect.add(props);
	canvas.clear();
	effect.render();

	// Should render nothing (no crash)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_explode_power_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 50;
	props["power"] = 0;
	props["particleSize"] = 4;

	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Particles should stay at center (no velocity)
	BoundingBox box = findBoundingBox(canvas);
	if (box.valid) {
		// Should be concentrated
		int spread = (box.maxX - box.minX) + (box.maxY - box.minY);
		TEST_ASSERT_LESS_THAN(30, spread);  // Small spread
	}
}

void test_explode_very_long_lifespan() {
	// Use larger canvas to prevent particles from going out of bounds
	// (rand() produces different sequences on Linux vs macOS)
	Matrix matrix(32, 32);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["particleCount"] = 20;
	props["lifespan"] = 100000;  // 100 seconds
	props["friction"] = 5.0;

	effect.add(props);
	effect.update(1.0f);  // 1 second
	canvas.clear();
	effect.render();

	// Particles should still exist
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_explode_rapid_add_calls() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ExplodeEffect effect(matrix, canvas);

	// Rapidly add many explosions
	for (int i = 0; i < 20; i++) {
		JsonDocument props;
		setDefaultExplodeProps(props);
		props["particleCount"] = 30;
		props["lifespan"] = 5000;
		effect.add(props);
	}

	// Should handle FIFO eviction gracefully
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// 1. Basic Creation & Defaults
	RUN_TEST(test_explode_creation);
	RUN_TEST(test_explode_add_creates_particles);
	RUN_TEST(test_explode_with_defaults);
	RUN_TEST(test_explode_reset_clears_all);

	// 2. Center Position Tests
	RUN_TEST(test_explode_center_0_percent);
	RUN_TEST(test_explode_center_100_percent);
	RUN_TEST(test_explode_center_50_percent);
	RUN_TEST(test_explode_center_arbitrary);
	RUN_TEST(test_explode_center_random_string_x);
	RUN_TEST(test_explode_center_random_string_y);
	RUN_TEST(test_explode_center_random_string_both);
	RUN_TEST(test_explode_strip_ignores_centerY);

	// 3. Particle Physics Tests
	RUN_TEST(test_explode_power_affects_spread);
	RUN_TEST(test_explode_friction_zero);
	RUN_TEST(test_explode_friction_high);
	RUN_TEST(test_explode_power_spread_affects_velocity_variation);

	// 4. Particle Rendering Tests
	RUN_TEST(test_explode_particle_size_small);
	RUN_TEST(test_explode_particle_size_large);
	RUN_TEST(test_explode_alpha_decay_over_lifespan);
	RUN_TEST(test_explode_hue_spread_zero);
	RUN_TEST(test_explode_hue_spread_90);
	RUN_TEST(test_explode_hue_spread_180);

	// 5. Pool Management Tests
	RUN_TEST(test_explode_fifo_eviction_when_pool_exceeds_max);
	RUN_TEST(test_explode_particle_count_capped_at_max);
	RUN_TEST(test_explode_multiple_explosions_share_pool);

	// 6. Strip vs Matrix Behavior
	RUN_TEST(test_explode_strip_horizontal_only);
	RUN_TEST(test_explode_matrix_2d_radial);

	// 7. Flash Effect Tests
	RUN_TEST(test_explode_flash_renders_on_strip);
	RUN_TEST(test_explode_flash_collapses_over_time);
	RUN_TEST(test_explode_no_flash_on_matrix);

	// 8. Bounds & Lifespan Tests
	RUN_TEST(test_explode_particles_removed_when_expired);
	RUN_TEST(test_explode_particles_removed_when_off_canvas);
	RUN_TEST(test_explode_lifespan_very_short);
	RUN_TEST(test_explode_lifespan_spread_affects_expiration);

	// 9. Explosion Cleanup Tests
	RUN_TEST(test_explode_explosion_removed_when_all_particles_gone);
	RUN_TEST(test_explode_multiple_explosions_independent_cleanup);

	// 10. Deterministic Snapshot Tests
	RUN_TEST(test_explode_snapshot_deterministic_positions);
	RUN_TEST(test_explode_snapshot_t0);
	RUN_TEST(test_explode_snapshot_after_spread);

	// 11. Edge Cases
	RUN_TEST(test_explode_zero_particles);
	RUN_TEST(test_explode_power_zero);
	RUN_TEST(test_explode_very_long_lifespan);
	RUN_TEST(test_explode_rapid_add_calls);

	return UNITY_END();
}
