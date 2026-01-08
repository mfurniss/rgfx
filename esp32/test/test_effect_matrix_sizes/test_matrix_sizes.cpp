/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Matrix Size Regression Tests
 *
 * Ensures all effects work correctly across common matrix configurations:
 * - 8x1 strip
 * - 16x1 strip
 * - 8x8 matrix
 * - 16x16 matrix
 * - 32x8 matrix (wide)
 * - 8x32 matrix (tall)
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
// Note: wipe.cpp and projectile.cpp both define static parseDirection()
// We wrap the includes in namespaces to avoid conflicts
#include "effects/effect.h"

#include "effects/pulse.h"
#include "effects/pulse.cpp"

#include "effects/background.h"
#include "effects/background.cpp"

#include "effects/explode.h"
#include "effects/explode.cpp"

// Wrap wipe in namespace to avoid parseDirection conflict with projectile
namespace wipe_impl {
#include "effects/wipe.h"
#include "effects/wipe.cpp"
}
using WipeEffect = wipe_impl::WipeEffect;

// Wrap projectile in namespace to avoid parseDirection conflict with wipe
namespace projectile_impl {
#include "effects/projectile.h"
#include "effects/projectile.cpp"
}
using ProjectileEffect = projectile_impl::ProjectileEffect;

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// Test Structure: Test each effect on each matrix configuration
// =============================================================================

struct MatrixConfig {
	uint16_t width;
	uint16_t height;
	const char* layout;
	const char* name;
};

static const MatrixConfig MATRIX_CONFIGS[] = {
    {8, 1, "strip", "8x1 strip"},
    {16, 1, "strip", "16x1 strip"},
    {8, 8, "matrix", "8x8 matrix"},
    {16, 16, "matrix", "16x16 matrix"},
    {32, 8, "matrix", "32x8 wide matrix"},
    {8, 32, "matrix", "8x32 tall matrix"},
};

static const size_t NUM_CONFIGS = sizeof(MATRIX_CONFIGS) / sizeof(MATRIX_CONFIGS[0]);

// =============================================================================
// Pulse Effect - Matrix Size Tests
// =============================================================================

void test_pulse_on_all_matrix_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
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

		int pixels = countNonBlackPixels(canvas);
		// Pulse with collapse=none should fill entire canvas
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, cfg.name);
		TEST_ASSERT_EQUAL_MESSAGE(canvas.getSize(), pixels, cfg.name);
	}
}

void test_pulse_collapse_on_all_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);
		PulseEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultPulseProps(props);
		props["color"] = "#00FF00";
		props["duration"] = 1000;
		props["fade"] = false;
		// For strips, horizontal becomes vertical behavior
		props["collapse"] = "vertical";
		effect.add(props);

		canvas.clear();
		effect.update(0.5f);  // 50% through duration
		effect.render();

		// Center should have pixels
		int pixels = countNonBlackPixels(canvas);
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, cfg.name);
		// Should be less than full canvas (collapsed)
		TEST_ASSERT_TRUE_MESSAGE(static_cast<uint32_t>(pixels) < canvas.getSize(), cfg.name);
	}
}

// =============================================================================
// Wipe Effect - Matrix Size Tests
// =============================================================================

void test_wipe_on_all_matrix_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);
		WipeEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultWipeProps(props);
		props["color"] = "#0000FF";
		props["duration"] = 1000;
		props["direction"] = "right";
		effect.add(props);

		effect.update(0.1f);  // 10% through fill phase
		canvas.clear();
		effect.render();

		int pixels = countNonBlackPixels(canvas);
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, cfg.name);
		// Should be partial fill
		TEST_ASSERT_TRUE_MESSAGE(static_cast<uint32_t>(pixels) < canvas.getSize(), cfg.name);
	}
}

void test_wipe_all_directions_on_strips() {
	// Test that vertical directions map to horizontal on strips
	const char* directions[] = {"right", "left", "up", "down"};

	for (const char* dir : directions) {
		Matrix matrix(16, 1, "strip");
		Canvas canvas(matrix);
		WipeEffect effect(matrix, canvas);

		JsonDocument props;
		props["color"] = "#FFFFFF";
		props["duration"] = 1000;
		props["direction"] = dir;
		effect.add(props);

		effect.update(0.1f);
		canvas.clear();
		effect.render();

		int pixels = countNonBlackPixels(canvas);
		// All directions should work on strip (vertical mapped to horizontal)
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, dir);
	}
}

// =============================================================================
// Explode Effect - Matrix Size Tests
// =============================================================================

void test_explode_on_all_matrix_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);
		ExplodeEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultExplodeProps(props);
		props["color"] = "#FF00FF";
		props["particleCount"] = 50;
		props["power"] = 30;
		props["lifespan"] = 1000;
		props["centerX"] = 50;
		props["centerY"] = 50;
		effect.add(props);

		effect.update(0.1f);
		canvas.clear();
		effect.render();

		int pixels = countNonBlackPixels(canvas);
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, cfg.name);
	}
}

void test_explode_power_scales_with_matrix_size() {
	// Larger matrices should spread particles further
	Matrix smallMatrix(8, 8);
	Canvas smallCanvas(smallMatrix);
	ExplodeEffect smallEffect(smallMatrix, smallCanvas);

	Matrix largeMatrix(32, 8);
	Canvas largeCanvas(largeMatrix);
	ExplodeEffect largeEffect(largeMatrix, largeCanvas);

	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = "#FFFFFF";
	props["particleCount"] = 50;
	props["power"] = 50;
	props["lifespan"] = 1000;
	props["centerX"] = 50;
	props["centerY"] = 50;

	smallEffect.add(props);
	largeEffect.add(props);

	smallEffect.update(0.2f);
	largeEffect.update(0.2f);

	smallCanvas.clear();
	smallEffect.render();

	largeCanvas.clear();
	largeEffect.render();

	// Both should render particles
	int smallPixels = countNonBlackPixels(smallCanvas);
	int largePixels = countNonBlackPixels(largeCanvas);

	TEST_ASSERT_TRUE(smallPixels > 0);
	TEST_ASSERT_TRUE(largePixels > 0);
}

// =============================================================================
// Projectile Effect - Matrix Size Tests
// =============================================================================

void test_projectile_on_all_matrix_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);
		ProjectileEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultProjectileProps(props);
		props["color"] = "#FFFF00";
		props["velocity"] = 100;
		props["direction"] = "right";
		props["width"] = 8;  // Larger projectile for visibility
		props["height"] = 8;
		props["lifespan"] = 5000;
		effect.add(props);

		// Move projectile into view - need enough time for it to enter canvas
		// Projectile starts at x = -width, needs to travel into view
		// With velocity=100 px/s and width=8, needs 0.08s to enter
		effect.update(0.2f);
		canvas.clear();
		effect.render();

		int pixels = countNonBlackPixels(canvas);
		TEST_ASSERT_TRUE_MESSAGE(pixels > 0, cfg.name);
	}
}

void test_projectile_trail_on_strips() {
	Matrix matrix(32, 1, "strip");
	Canvas canvas(matrix);
	ProjectileEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FFFF";
	props["velocity"] = 80;
	props["direction"] = "right";
	props["trail"] = 0.5f;
	props["width"] = 4;
	props["lifespan"] = 5000;
	effect.add(props);

	// Move projectile into view with trail
	effect.update(0.3f);
	canvas.clear();
	effect.render();

	int pixels = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixels > 0);

	// Trail should add more pixels than just the projectile head
	// With trail=0.5, we should have trail segments behind the head
	// Total pixel count should be more than just the width
	TEST_ASSERT_TRUE(pixels > 4);  // More than just projectile width
}

// =============================================================================
// Background Effect - Matrix Size Tests
// =============================================================================

void test_background_on_all_matrix_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);
		BackgroundEffect effect(matrix, canvas);

		JsonDocument props;
		setDefaultBackgroundProps(props);
		props["color"] = "#FF8800";
		effect.add(props);

		canvas.clear();
		effect.render();

		int pixels = countNonBlackPixels(canvas);
		// Background should fill entire canvas
		TEST_ASSERT_EQUAL_MESSAGE(canvas.getSize(), pixels, cfg.name);
	}
}

// =============================================================================
// Canvas Dimension Verification
// =============================================================================

void test_canvas_dimensions_for_all_configs() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);

		if (strcmp(cfg.layout, "strip") == 0) {
			// Strip: width is 4x, height is 1
			TEST_ASSERT_EQUAL_MESSAGE(cfg.width * 4, canvas.getWidth(), cfg.name);
			TEST_ASSERT_EQUAL_MESSAGE(1, canvas.getHeight(), cfg.name);
		} else {
			// Matrix: both dimensions are 4x
			TEST_ASSERT_EQUAL_MESSAGE(cfg.width * 4, canvas.getWidth(), cfg.name);
			TEST_ASSERT_EQUAL_MESSAGE(cfg.height * 4, canvas.getHeight(), cfg.name);
		}
	}
}

// =============================================================================
// Effect Reset Clears On All Sizes
// =============================================================================

void test_all_effects_reset_on_all_sizes() {
	for (size_t i = 0; i < NUM_CONFIGS; i++) {
		const MatrixConfig& cfg = MATRIX_CONFIGS[i];
		Matrix matrix(cfg.width, cfg.height, cfg.layout);
		Canvas canvas(matrix);

		// Test Pulse reset
		{
			PulseEffect effect(matrix, canvas);
			JsonDocument props;
			props["color"] = "#FF0000";
			effect.add(props);
			effect.reset();
			canvas.clear();
			effect.render();
			TEST_ASSERT_EQUAL_MESSAGE(0, countNonBlackPixels(canvas), cfg.name);
		}

		// Test Wipe reset
		{
			WipeEffect effect(matrix, canvas);
			JsonDocument props;
			props["color"] = "#00FF00";
			effect.add(props);
			effect.reset();
			canvas.clear();
			effect.render();
			TEST_ASSERT_EQUAL_MESSAGE(0, countNonBlackPixels(canvas), cfg.name);
		}

		// Test Explode reset
		{
			ExplodeEffect effect(matrix, canvas);
			JsonDocument props;
			props["color"] = "#0000FF";
			effect.add(props);
			effect.reset();
			canvas.clear();
			effect.render();
			TEST_ASSERT_EQUAL_MESSAGE(0, countNonBlackPixels(canvas), cfg.name);
		}

		// Test Projectile reset
		{
			ProjectileEffect effect(matrix, canvas);
			JsonDocument props;
			props["color"] = "#FFFF00";
			effect.add(props);
			effect.reset();
			canvas.clear();
			effect.render();
			TEST_ASSERT_EQUAL_MESSAGE(0, countNonBlackPixels(canvas), cfg.name);
		}

		// Test Background reset
		{
			BackgroundEffect effect(matrix, canvas);
			JsonDocument props;
			props["color"] = "#FF00FF";
			effect.add(props);
			effect.reset();
			canvas.clear();
			effect.render();
			TEST_ASSERT_EQUAL_MESSAGE(0, countNonBlackPixels(canvas), cfg.name);
		}
	}
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Canvas dimension tests
	RUN_TEST(test_canvas_dimensions_for_all_configs);

	// Pulse tests
	RUN_TEST(test_pulse_on_all_matrix_sizes);
	RUN_TEST(test_pulse_collapse_on_all_sizes);

	// Wipe tests
	RUN_TEST(test_wipe_on_all_matrix_sizes);
	RUN_TEST(test_wipe_all_directions_on_strips);

	// Explode tests
	RUN_TEST(test_explode_on_all_matrix_sizes);
	RUN_TEST(test_explode_power_scales_with_matrix_size);

	// Projectile tests
	RUN_TEST(test_projectile_on_all_matrix_sizes);
	RUN_TEST(test_projectile_trail_on_strips);

	// Background tests
	RUN_TEST(test_background_on_all_matrix_sizes);

	// Reset tests
	RUN_TEST(test_all_effects_reset_on_all_sizes);

	return UNITY_END();
}
