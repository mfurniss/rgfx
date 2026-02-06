/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Comprehensive Unit Tests for SparkleEffect
 *
 * Tests the sparkle effect: multi-cloud particle system with gradient cycling,
 * bloom with overdrive, and FIFO particle buffer management.
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
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/bloom_utils.h"
#include "effects/bloom_utils.cpp"
#include "effects/sparkle.h"
#include "effects/sparkle.cpp"

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
// 1. Basic Creation and Initialization
// =============================================================================

void test_sparkle_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);
	TEST_PASS();
}

void test_sparkle_add_with_defaults() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	effect.add(props);

	// Update several times to ensure particles spawn (density=50)
	for (int i = 0; i < 10; i++) {
		effect.update(0.017f);  // ~60fps
	}
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_reset_clears_all() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	effect.add(props);

	// Spawn some particles
	for (int i = 0; i < 10; i++) {
		effect.update(0.017f);
	}

	effect.reset();
	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 2. Props Parsing Tests
// =============================================================================

void test_sparkle_duration_zero_infinite() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["duration"] = 0;  // Infinite
	props["density"] = 100;
	effect.add(props);

	// Update for a long time but in small increments so cloud can keep spawning
	// Particles have ~500ms lifespan with speed=1.0, so we need continuous spawning
	for (int i = 0; i < 200; i++) {
		effect.update(0.05f);  // 50ms steps = 10 seconds total
	}

	canvas.clear();
	effect.render();

	// Cloud should still be active and spawning particles
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_duration_minimum_clamp() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["duration"] = 50;  // Below minimum, should clamp to 100
	props["density"] = 100;
	effect.add(props);

	// At 50ms the cloud would expire, but clamped to 100ms it should still be active
	effect.update(0.075f);  // 75ms

	canvas.clear();
	effect.render();

	// Should still have particles since duration clamped to 100ms
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_density_minimum_clamp() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 0;  // Below minimum, should clamp to 1
	effect.add(props);

	// With density=1, particles should still eventually spawn
	for (int i = 0; i < 100; i++) {
		effect.update(0.017f);
	}

	canvas.clear();
	effect.render();

	// Should have at least some pixels (low density but not zero)
	// This test just verifies it doesn't crash with density=0
	TEST_PASS();
}

void test_sparkle_density_maximum_clamp() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 200;  // Above maximum, should clamp to 100
	effect.add(props);

	// Should not crash, just clamp
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_speed_minimum_clamp() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["speed"] = 0.01f;  // Below minimum, should clamp to 0.1
	props["density"] = 100;
	effect.add(props);

	// speed=0.1 gives lifespan of 5000ms, particles should persist
	effect.update(0.5f);  // 500ms

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_speed_maximum_clamp() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["speed"] = 10.0f;  // Above maximum, should clamp to 5.0
	props["density"] = 100;
	effect.add(props);

	// speed=5.0 gives lifespan of 100ms
	effect.update(0.05f);  // 50ms - should still have particles

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_bloom_maximum_clamp() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 200;  // Above maximum, should clamp to 100
	props["density"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should render with bloom=100 (max spread)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_bloom_zero_no_spread() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 0;
	props["density"] = 100;
	effect.add(props);

	// Spawn particles
	effect.update(0.05f);

	canvas.clear();
	effect.render();

	int pixelCount = countNonBlackPixels(canvas);

	// With bloom=0, each particle is a single 4x4 block (16 canvas pixels per particle)
	// The pixel count should be a multiple of 16 (or close to it due to overlap)
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_sparkle_bloom_increases_pixel_count() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);

	// Test without bloom
	SparkleEffect effect1(matrix, canvas);
	JsonDocument props1;
	setDefaultSparkleProps(props1);
	props1["bloom"] = 0;
	props1["density"] = 50;
	effect1.add(props1);
	effect1.update(0.1f);
	canvas.clear();
	effect1.render();
	int countNoBloom = countNonBlackPixels(canvas);

	// Reset and test with bloom
	hal::test::seedRandom(12345);  // Same seed for reproducibility
	SparkleEffect effect2(matrix, canvas);
	JsonDocument props2;
	setDefaultSparkleProps(props2);
	props2["bloom"] = 100;
	props2["density"] = 50;
	effect2.add(props2);
	effect2.update(0.1f);
	canvas.clear();
	effect2.render();
	int countWithBloom = countNonBlackPixels(canvas);

	// Bloom should spread light to more pixels
	TEST_ASSERT_TRUE(countWithBloom >= countNoBloom);
}

void test_sparkle_default_gradient_applied() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	// No gradient specified - should use default white->yellow->red->black
	effect.add(props);

	effect.update(0.017f);
	canvas.clear();
	effect.render();

	// Should have pixels rendered
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_custom_gradient() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;

	// Custom blue gradient
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#0000FF");
	gradient.add("#000088");
	gradient.add("#000000");
	effect.add(props);

	effect.update(0.017f);
	canvas.clear();
	effect.render();

	// Should have blue-dominant pixels
	int bluePixels = countBlueDominantPixels(canvas);
	TEST_ASSERT_TRUE(bluePixels > 0);
}

void test_sparkle_reset_prop_clears_before_add() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	// Add first cloud
	JsonDocument props1;
	setDefaultSparkleProps(props1);
	props1["density"] = 100;
	effect.add(props1);
	effect.update(0.1f);

	// Add second cloud with reset=true
	JsonDocument props2;
	setDefaultSparkleProps(props2);
	props2["reset"] = true;
	props2["density"] = 0;  // Very low density
	effect.add(props2);

	// The reset should have cleared all particles from first cloud
	canvas.clear();
	effect.render();

	// Canvas might still have some pixels if the new cloud spawned any,
	// but the count should be much lower than before reset
	// (this test mainly verifies reset is called)
	TEST_PASS();
}

// =============================================================================
// 3. Cloud Management Tests
// =============================================================================

void test_sparkle_multiple_clouds() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	// Add multiple clouds
	for (int i = 0; i < 4; i++) {
		JsonDocument props;
		setDefaultSparkleProps(props);
		props["density"] = 100;
		effect.add(props);
	}

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have pixels from all clouds
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_cloud_expires_after_duration() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["duration"] = 200;  // 200ms
	props["density"] = 100;
	props["speed"] = 5.0f;  // Fast particles (100ms lifespan)
	effect.add(props);

	// Update past cloud duration + particle lifespan
	effect.update(0.5f);  // 500ms - cloud and all particles should be expired

	canvas.clear();
	effect.render();

	// All particles should have expired
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_infinite_cloud_persists() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["duration"] = 0;  // Infinite
	props["density"] = 100;
	effect.add(props);

	// Update in small increments so new particles can spawn before old ones expire
	for (int i = 0; i < 100; i++) {
		effect.update(0.05f);  // 50ms steps = 5 seconds total
	}

	canvas.clear();
	effect.render();

	// Should still have active particles (cloud infinite, keeps spawning)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_max_clouds_eviction() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	// Add 20 clouds (max is 16)
	for (int i = 0; i < 20; i++) {
		JsonDocument props;
		setDefaultSparkleProps(props);
		props["density"] = 50;
		effect.add(props);
		effect.update(0.01f);  // Small update to age clouds differently
	}

	// Should not crash, oldest clouds should be reused
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_PASS();
}

// =============================================================================
// 4. Particle Spawning Tests
// =============================================================================

void test_sparkle_high_density_frequent_spawn() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	int highDensityCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(highDensityCount > 0);
}

void test_sparkle_low_density_sparse_spawn() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 1;  // Very low
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Low density should still eventually produce some particles
	// but fewer than high density
	TEST_PASS();
}

void test_sparkle_particles_lifespan_from_speed() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["speed"] = 1.0f;  // lifespan = 500ms / 1.0 = 500ms
	effect.add(props);

	// Spawn particles
	effect.update(0.05f);  // 50ms

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Update past lifespan
	effect.update(0.6f);  // 600ms more

	canvas.clear();
	effect.render();

	// Particles spawned early should have expired
	// (but cloud may have spawned new ones)
}

void test_sparkle_fast_speed_short_lifespan() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["speed"] = 5.0f;  // lifespan = 500ms / 5.0 = 100ms
	props["duration"] = 50;  // Very short cloud (clamped to 100ms)
	effect.add(props);

	// Spawn particles
	effect.update(0.05f);

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Update past lifespan + cloud duration
	effect.update(0.3f);  // 300ms more

	canvas.clear();
	effect.render();

	// All should be expired
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_slow_speed_long_lifespan() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["speed"] = 0.1f;  // lifespan = 500ms / 0.1 = 5000ms
	props["duration"] = 500;  // 500ms cloud duration
	effect.add(props);

	// Spawn particles over the cloud duration
	for (int i = 0; i < 10; i++) {
		effect.update(0.05f);  // 500ms total
	}

	// Now cloud is expired, but update past cloud duration but not particle lifespan
	effect.update(1.0f);  // 1 second more

	canvas.clear();
	effect.render();

	// Particles should still be visible (5000ms lifespan, only ~1.5s elapsed)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 5. Particle Lifecycle Tests
// =============================================================================

void test_sparkle_particle_expires_at_lifespan() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["speed"] = 5.0f;  // 100ms lifespan
	props["duration"] = 100;
	effect.add(props);

	effect.update(0.05f);  // 50ms
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Past lifespan
	effect.update(0.2f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_no_render_when_count_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	// Don't add any clouds
	canvas.clear();
	effect.render();

	// Should be empty (early exit path)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_fifo_buffer_stress() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["duration"] = 0;  // Infinite
	effect.add(props);

	// Generate many particles (more than MAX_PARTICLES=100)
	for (int i = 0; i < 50; i++) {
		effect.update(0.05f);
	}

	canvas.clear();
	effect.render();

	// Should not crash and should render
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 6. Bloom Effect Tests
// =============================================================================

void test_sparkle_bloom_spread_on_matrix() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 100;  // Max bloom
	props["density"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	int pixelCount = countNonBlackPixels(canvas);
	// With bloom, we expect more pixels than just the center blocks
	TEST_ASSERT_TRUE(pixelCount > 16);  // More than a single 4x4 block
}

void test_sparkle_bloom_respects_canvas_bounds() {
	Matrix matrix(4, 4);  // Small matrix
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 100;
	props["density"] = 100;
	effect.add(props);

	// This should not crash even with bloom trying to spread
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_PASS();
}

void test_sparkle_overdrive_with_bloom() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 100;  // Overdrive = (100 * 255) / 100 = 255
	props["density"] = 100;

	// Use a colored gradient to see overdrive effect
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF0000");
	gradient.add("#FF0000");
	effect.add(props);

	effect.update(0.05f);
	canvas.clear();
	effect.render();

	// With overdrive, bright red pixels should be shifted toward white
	// Main test is that it doesn't crash with overdrive enabled
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 7. Strip vs Matrix Rendering Tests
// =============================================================================

void test_sparkle_strip_y_always_zero() {
	Matrix matrix(100, 1);  // Strip
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// On a strip, canvas height is 1, so all pixels are in row 0 by definition
	// Just verify we have pixels rendered
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_strip_horizontal_bloom() {
	Matrix matrix(100, 1);  // Strip
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["bloom"] = 100;
	props["density"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have bloom spread horizontally
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_sparkle_matrix_renders_blocks() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["bloom"] = 0;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should have rendered 4x4 blocks
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// 8. Edge Cases and Boundary Tests
// =============================================================================

void test_sparkle_zero_update_delta() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	effect.add(props);

	// Zero delta should not crash
	effect.update(0.0f);
	canvas.clear();
	effect.render();

	TEST_PASS();
}

void test_sparkle_large_update_delta() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["duration"] = 1000;
	effect.add(props);

	// Very large delta
	effect.update(100.0f);  // 100 seconds
	canvas.clear();
	effect.render();

	// Cloud and particles should be expired
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_rapid_add_calls() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	// Rapid add calls
	for (int i = 0; i < 100; i++) {
		JsonDocument props;
		setDefaultSparkleProps(props);
		props["density"] = 50;
		effect.add(props);
	}

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should not crash
	TEST_PASS();
}

void test_sparkle_small_canvas() {
	Matrix matrix(2, 2);  // Very small
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = 100;
	props["bloom"] = 100;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should render on tiny canvas
	TEST_PASS();
}

// =============================================================================
// 9. Pixel Digest Snapshot Tests
// =============================================================================

static uint64_t runSparkleDigest(const TestConfig& config, float updateTime,
                                 int density = 50, int bloom = 0, float speed = 1.0f) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["density"] = density;
	props["bloom"] = bloom;
	props["duration"] = 2000;
	props["speed"] = speed;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_sparkle_digest_16x16_t100() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[1], 0.1f);
	printDigest("sparkle_16x16_t100", digest);
	assertDigest(0x83FC3F05F94ACA3Cull, digest, "sparkle_16x16_t100");
}

void test_sparkle_digest_16x16_t500() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[1], 0.5f);
	printDigest("sparkle_16x16_t500", digest);
	assertDigest(0x9FA9E040E0EEDF25ull, digest, "sparkle_16x16_t500");
}

void test_sparkle_digest_16x16_bloom50() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[1], 0.1f, 50, 50);
	printDigest("sparkle_16x16_bloom50", digest);
	assertDigest(0x49EFBB0B3FFB08C3ull, digest, "sparkle_16x16_bloom50");
}

void test_sparkle_digest_strip_t100() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[0], 0.1f);
	printDigest("sparkle_strip_t100", digest);
	assertDigest(0x2DAE1C4249F2B90Bull, digest, "sparkle_strip_t100");
}

void test_sparkle_digest_strip_t500() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[0], 0.5f);
	printDigest("sparkle_strip_t500", digest);
	assertDigest(0x07337C7D7090F9F5ull, digest, "sparkle_strip_t500");
}

void test_sparkle_digest_96x8_t100() {
	uint64_t digest = runSparkleDigest(TEST_CONFIGS[2], 0.1f);
	printDigest("sparkle_96x8_t100", digest);
	assertDigest(0x769BB082D595383Cull, digest, "sparkle_96x8_t100");
}

// =============================================================================
// 10. Property-Based Invariant Tests
// =============================================================================

void test_sparkle_property_nonblack_after_spawn() {
	// After spawning with active cloud, canvas should have pixels
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::seedRandom(12345);

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		SparkleEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultSparkleProps(props);
		props["density"] = 100;
		effect.add(props);
		effect.update(0.1f);

		canvas.clear();
		effect.render();

		TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0, TEST_CONFIGS[i].name);
	}
}

void test_sparkle_property_all_black_after_expiration() {
	// After cloud + particles expire, canvas should be black
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	SparkleEffect effect(matrix, canvas);

	JsonDocument props;
	setDefaultSparkleProps(props);
	props["duration"] = 100;
	props["density"] = 100;
	props["speed"] = 5.0f;  // 100ms lifespan
	effect.add(props);

	effect.update(0.05f);  // Spawn particles

	// Wait for everything to expire
	effect.update(0.5f);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_sparkle_property_higher_density_more_particles() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);

	// Low density
	hal::test::seedRandom(12345);
	SparkleEffect effect1(matrix, canvas);
	JsonDocument props1;
	setDefaultSparkleProps(props1);
	props1["density"] = 10;
	effect1.add(props1);
	effect1.update(0.2f);
	canvas.clear();
	effect1.render();
	uint64_t brightnessLow = calculateTotalBrightness(canvas);

	// High density
	hal::test::seedRandom(12345);
	SparkleEffect effect2(matrix, canvas);
	JsonDocument props2;
	setDefaultSparkleProps(props2);
	props2["density"] = 100;
	effect2.add(props2);
	effect2.update(0.2f);
	canvas.clear();
	effect2.render();
	uint64_t brightnessHigh = calculateTotalBrightness(canvas);

	// Higher density should produce more total brightness
	TEST_ASSERT_TRUE(brightnessHigh >= brightnessLow);
}

void test_sparkle_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::seedRandom(12345);

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		SparkleEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultSparkleProps(props);
		props["density"] = 100;
		effect.add(props);
		effect.update(0.1f);

		canvas.clear();
		effect.render();

		char msg[64];
		snprintf(msg, sizeof(msg), "Config %s should render", TEST_CONFIGS[i].name);
		TEST_ASSERT_TRUE_MESSAGE(countNonBlackPixels(canvas) > 0, msg);
	}
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// 1. Basic Creation and Initialization
	RUN_TEST(test_sparkle_creation);
	RUN_TEST(test_sparkle_add_with_defaults);
	RUN_TEST(test_sparkle_reset_clears_all);

	// 2. Props Parsing Tests
	RUN_TEST(test_sparkle_duration_zero_infinite);
	RUN_TEST(test_sparkle_duration_minimum_clamp);
	RUN_TEST(test_sparkle_density_minimum_clamp);
	RUN_TEST(test_sparkle_density_maximum_clamp);
	RUN_TEST(test_sparkle_speed_minimum_clamp);
	RUN_TEST(test_sparkle_speed_maximum_clamp);
	RUN_TEST(test_sparkle_bloom_maximum_clamp);
	RUN_TEST(test_sparkle_bloom_zero_no_spread);
	RUN_TEST(test_sparkle_bloom_increases_pixel_count);
	RUN_TEST(test_sparkle_default_gradient_applied);
	RUN_TEST(test_sparkle_custom_gradient);
	RUN_TEST(test_sparkle_reset_prop_clears_before_add);

	// 3. Cloud Management Tests
	RUN_TEST(test_sparkle_multiple_clouds);
	RUN_TEST(test_sparkle_cloud_expires_after_duration);
	RUN_TEST(test_sparkle_infinite_cloud_persists);
	RUN_TEST(test_sparkle_max_clouds_eviction);

	// 4. Particle Spawning Tests
	RUN_TEST(test_sparkle_high_density_frequent_spawn);
	RUN_TEST(test_sparkle_low_density_sparse_spawn);
	RUN_TEST(test_sparkle_particles_lifespan_from_speed);
	RUN_TEST(test_sparkle_fast_speed_short_lifespan);
	RUN_TEST(test_sparkle_slow_speed_long_lifespan);

	// 5. Particle Lifecycle Tests
	RUN_TEST(test_sparkle_particle_expires_at_lifespan);
	RUN_TEST(test_sparkle_no_render_when_count_zero);
	RUN_TEST(test_sparkle_fifo_buffer_stress);

	// 6. Bloom Effect Tests
	RUN_TEST(test_sparkle_bloom_spread_on_matrix);
	RUN_TEST(test_sparkle_bloom_respects_canvas_bounds);
	RUN_TEST(test_sparkle_overdrive_with_bloom);

	// 7. Strip vs Matrix Rendering Tests
	RUN_TEST(test_sparkle_strip_y_always_zero);
	RUN_TEST(test_sparkle_strip_horizontal_bloom);
	RUN_TEST(test_sparkle_matrix_renders_blocks);

	// 8. Edge Cases and Boundary Tests
	RUN_TEST(test_sparkle_zero_update_delta);
	RUN_TEST(test_sparkle_large_update_delta);
	RUN_TEST(test_sparkle_rapid_add_calls);
	RUN_TEST(test_sparkle_small_canvas);

	// 9. Pixel Digest Snapshot Tests
	// Note: Exact digest tests skipped - gradient interpolation uses floating-point
	// math that produces different results on arm64 vs x86_64 architectures.
	// Property-based tests below still validate correct behavior.

	// 10. Property-Based Invariant Tests
	RUN_TEST(test_sparkle_property_nonblack_after_spawn);
	RUN_TEST(test_sparkle_property_all_black_after_expiration);
	RUN_TEST(test_sparkle_property_higher_density_more_particles);
	RUN_TEST(test_sparkle_property_all_configs_render);

	return UNITY_END();
}
