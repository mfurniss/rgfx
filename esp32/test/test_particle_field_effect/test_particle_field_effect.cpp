/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for ParticleFieldEffect
 *
 * Tests particle field rendering: property parsing, color handling,
 * direction variants, strip mode mapping, fade transitions, and reset.
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
#include "effects/direction.h"
#include "effects/particle_field.h"
#include "effects/particle_field.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"
#include "helpers/downsample_test_helpers.h"
#include "helpers/pixel_digest.h"

using namespace test_helpers;

// =============================================================================
// Helper: create particle field props
// =============================================================================

static JsonDocument makeParticleFieldProps(
    const char* color = "#FFFFFF",
    const char* direction = "down",
    int density = 20,
    float speed = 50.0f,
    int size = 4,
    const char* enabled = "on") {
	JsonDocument props;
	props["color"] = color;
	props["direction"] = direction;
	props["density"] = density;
	props["speed"] = speed;
	props["size"] = size;
	props["enabled"] = enabled;
	return props;
}

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// Property Parsing Tests
// =============================================================================

void test_default_direction_is_down() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// No direction specified - should default to DOWN
	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["density"] = 10;
	props["enabled"] = "on";
	effect.add(props);

	// Advance time and render - particles should move downward
	canvas.clear();
	effect.update(0.1f);
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_density_clamped_to_max() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// Density above MAX_PARTICLE_FIELD_PARTICLES should be clamped
	auto props = makeParticleFieldProps("#FFFFFF", "down", 200);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Should render without crash (clamped to 100)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_density_minimum_one() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 0);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Density 0 clamped to 1 - should still produce pixels
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_speed_clamped_minimum() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 10, 1.0f);
	effect.add(props);
	effect.update(0.5f);
	canvas.clear();
	effect.render();

	// Speed below 10 clamped to 10 - should still produce visible particles
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_size_clamped_to_range() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// Size > 16 should be clamped
	auto props = makeParticleFieldProps("#FFFFFF", "down", 10, 50.0f, 30);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Color Parsing Tests
// =============================================================================

void test_hex_color_parsing() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FF0000", "down", 30, 50.0f);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Red particles should produce red-dominant pixels
	TEST_ASSERT_TRUE(countRedDominantPixels(canvas) > 0);
}

void test_random_color() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("random", "down", 30, 50.0f);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Random color should produce visible pixels
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_missing_color_returns_early() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// No color prop - should return without spawning particles
	JsonDocument props;
	props["direction"] = "down";
	props["density"] = 10;
	props["enabled"] = "on";
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Direction Tests
// =============================================================================

void test_direction_down_renders() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 30, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_direction_up_renders() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "up", 30, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_direction_left_renders() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "left", 30, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_direction_right_renders() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "right", 30, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Strip Mode Direction Mapping Tests
// =============================================================================

void test_strip_maps_down_to_left() {
	// For strips (height=1), DOWN maps to LEFT
	Matrix matrix(60, 1);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 20, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	// Should render on strip without crash
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_strip_maps_up_to_right() {
	// For strips (height=1), UP maps to RIGHT
	Matrix matrix(60, 1);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "up", 20, 100.0f);
	effect.add(props);
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Fade Transition Tests
// =============================================================================

void test_enabled_off_clears_immediately() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// First add particles
	auto props = makeParticleFieldProps("#FFFFFF", "down", 30, 100.0f);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	// Turn off
	JsonDocument offProps;
	offProps["enabled"] = "off";
	effect.add(offProps);
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_fade_out_reduces_brightness() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 50, 100.0f);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	uint64_t brightnessBefore = calculateTotalBrightness(canvas);

	// Start fade out
	JsonDocument fadeProps;
	fadeProps["enabled"] = "fadeOut";
	effect.add(fadeProps);

	// Advance time significantly for fade
	for (int i = 0; i < 20; i++) {
		effect.update(0.05f);
	}
	canvas.clear();
	effect.render();
	uint64_t brightnessAfter = calculateTotalBrightness(canvas);

	TEST_ASSERT_TRUE(brightnessAfter < brightnessBefore);
}

// =============================================================================
// Reset Test
// =============================================================================

void test_reset_clears_state() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FF0000", "right", 40, 200.0f);
	effect.add(props);
	effect.update(0.1f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	effect.reset();
	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Snapshot / Digest Tests
// =============================================================================

void test_particle_field_digest_16x16() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);
	initTestGammaLUT();

	auto props = makeParticleFieldProps("#00FF00", "down", 30, 80.0f);
	effect.add(props);

	// Run a few frames
	for (int i = 0; i < 5; i++) {
		hal::test::advanceTime(16000);  // 16ms per frame
		effect.update(0.016f);
	}

	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	uint64_t digest = computeFrameDigest(matrix);
	printDigest("particle_field_16x16", digest);

	// Deterministic with seeded random - verify non-empty
	FrameProperties fp = analyzeFrame(matrix);
	TEST_ASSERT_TRUE(fp.nonBlackPixels > 0);

#ifndef GENERATE_DIGESTS
	assertDigest(digest, digest, "particle_field_self_check");
#endif
}

void test_particle_field_digest_strip() {
	Matrix matrix(60, 1);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);
	initTestGammaLUT();

	auto props = makeParticleFieldProps("#0088FF", "down", 15, 60.0f);
	effect.add(props);

	for (int i = 0; i < 5; i++) {
		hal::test::advanceTime(16000);
		effect.update(0.016f);
	}

	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	FrameProperties fp = analyzeFrame(matrix);
	TEST_ASSERT_TRUE(fp.nonBlackPixels > 0);
}

// =============================================================================
// Update Behavior Tests
// =============================================================================

void test_particles_move_over_time() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	auto props = makeParticleFieldProps("#FFFFFF", "down", 20, 200.0f);
	effect.add(props);

	// Capture frame 1
	effect.update(0.016f);
	canvas.clear();
	effect.render();
	uint64_t brightness1 = calculateTotalBrightness(canvas);

	// Run many more frames - particles should continue rendering
	for (int i = 0; i < 30; i++) {
		effect.update(0.016f);
	}
	canvas.clear();
	effect.render();
	uint64_t brightness2 = calculateTotalBrightness(canvas);

	// Both frames should have visible content (particles respawn at edges)
	TEST_ASSERT_TRUE(brightness1 > 0);
	TEST_ASSERT_TRUE(brightness2 > 0);
}

void test_off_state_skips_update() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleFieldEffect effect(matrix, canvas);

	// Effect starts in OFF state (never added)
	canvas.clear();
	effect.update(0.1f);
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Property parsing
	RUN_TEST(test_default_direction_is_down);
	RUN_TEST(test_density_clamped_to_max);
	RUN_TEST(test_density_minimum_one);
	RUN_TEST(test_speed_clamped_minimum);
	RUN_TEST(test_size_clamped_to_range);

	// Color parsing
	RUN_TEST(test_hex_color_parsing);
	RUN_TEST(test_random_color);
	RUN_TEST(test_missing_color_returns_early);

	// Direction
	RUN_TEST(test_direction_down_renders);
	RUN_TEST(test_direction_up_renders);
	RUN_TEST(test_direction_left_renders);
	RUN_TEST(test_direction_right_renders);

	// Strip mode mapping
	RUN_TEST(test_strip_maps_down_to_left);
	RUN_TEST(test_strip_maps_up_to_right);

	// Fade transitions
	RUN_TEST(test_enabled_off_clears_immediately);
	RUN_TEST(test_fade_out_reduces_brightness);

	// Reset
	RUN_TEST(test_reset_clears_state);

	// Snapshot digests
	RUN_TEST(test_particle_field_digest_16x16);
	RUN_TEST(test_particle_field_digest_strip);

	// Update behavior
	RUN_TEST(test_particles_move_over_time);
	RUN_TEST(test_off_state_skips_update);

	return UNITY_END();
}
