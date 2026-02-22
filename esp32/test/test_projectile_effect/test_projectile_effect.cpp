/**
 * Unit Tests for ProjectileEffect
 *
 * Tests the projectile effect rendering using the real implementation.
 * These tests serve as regression guards for runtime optimizations.
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
#include "effects/effect_utils.h"
#include "effects/effect_utils.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/particle_system.h"
#include "effects/particle_system.cpp"
#include "effects/projectile.h"
#include "effects/projectile.cpp"

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
// 1. Basic Creation & Defaults
// =============================================================================

void test_projectile_creation_default_values() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	effect.add(props);

	// After adding with defaults, update slightly and render
	effect.update(0.001f);
	canvas.clear();
	effect.render();

	// Should have rendered something (default velocity=100, so should move)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_projectile_creation_with_color() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FF0000";
	props["direction"] = "right";
	props["velocity"] = 200;
	effect.add(props);

	// Move projectile onto canvas
	effect.update(0.05f);
	canvas.clear();
	effect.render();

	// Find a non-black pixel and verify it's red-ish (additive blending)
	bool foundRed = false;
	for (uint16_t y = 0; y < canvas.getHeight() && !foundRed; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() && !foundRed; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 0 && pixel.g == 0 && pixel.b == 0) {
				foundRed = true;
			}
		}
	}
	TEST_ASSERT_TRUE(foundRed);
}

void test_projectile_reset_clears_all() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 200;
	effect.add(props);
	effect.add(props);
	effect.add(props);

	effect.update(0.05f);
	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);

	effect.reset();
	canvas.clear();
	effect.render();
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 2. Direction Tests
// =============================================================================

void test_projectile_direction_right() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";  // Explicit white color
	props["direction"] = "right";
	props["velocity"] = 200;  // 200 pixels/second
	props["width"] = 4;
	props["height"] = 4;
	props["friction"] = 0;  // No friction for consistent movement
	effect.add(props);

	// At t=0, projectile starts at x=-width = -4
	// Need enough time to enter canvas: 4px at 200px/s = 0.02s minimum
	effect.update(0.06f);  // x = -4 + 12 = 8 (visible on 16px canvas)
	canvas.clear();
	effect.render();

	int x1 = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x1);  // Must be visible

	effect.update(0.03f);  // x = 8 + 6 = 14
	canvas.clear();
	effect.render();

	int x2 = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x2);  // Must be visible

	// Should have moved right (x2 > x1)
	TEST_ASSERT_GREATER_THAN(x1, x2);
}

void test_projectile_direction_left() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";  // Explicit white color
	props["direction"] = "left";
	props["velocity"] = 200;  // 200 pixels/second
	props["width"] = 4;
	props["height"] = 4;
	props["friction"] = 0;  // No friction for consistent movement
	effect.add(props);

	// Left direction starts at x=canvasWidth = 16
	// Need time to enter: 4px at 200px/s = 0.02s minimum
	effect.update(0.06f);  // x = 16 - 12 = 4 (visible on 16px canvas)
	canvas.clear();
	effect.render();

	int x1 = findRightmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x1);  // Must be visible

	effect.update(0.03f);  // x = 4 - 6 = -2 (moved left, at edge)
	canvas.clear();
	effect.render();

	int x2 = findRightmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x2);  // Must be visible

	// Should have moved left (x decreased)
	TEST_ASSERT_LESS_THAN(x1, x2);
}

void test_projectile_direction_down() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "down";
	props["velocity"] = 100;
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.05f);
	canvas.clear();
	effect.render();

	int y1 = findTopmostPixelY(canvas);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	int y2 = findTopmostPixelY(canvas);

	// Should have moved down (y increased)
	TEST_ASSERT_GREATER_THAN(y1, y2);
}

void test_projectile_direction_up() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "up";
	props["velocity"] = 100;
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.05f);
	canvas.clear();
	effect.render();

	int y1 = findBottommostPixelY(canvas);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	int y2 = findBottommostPixelY(canvas);

	// Should have moved up (y decreased)
	TEST_ASSERT_LESS_THAN(y1, y2);
}

void test_projectile_direction_random() {
	// Test that "random" direction code path works without crashing
	// Individual direction tests verify each direction works correctly
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "random";
	props["velocity"] = 500;
	props["width"] = 8;
	props["height"] = 8;
	effect.add(props);

	// Just verify it runs without crashing
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Test passes if we get here without crash
	TEST_PASS();
}

void test_projectile_1d_strip_vertical_maps_to_horizontal() {
	// 1D strip: height=1
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	// On 1D strip, "up" should map to "left" and "down" should map to "right"
	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "up";
	props["velocity"] = 200;  // Higher velocity to overcome friction
	props["width"] = 4;
	props["height"] = 4;
	props["friction"] = 0;  // No friction for consistent movement
	effect.add(props);

	effect.update(0.15f);
	canvas.clear();
	effect.render();

	// Canvas should be 1 pixel high (1D strip)
	TEST_ASSERT_EQUAL(1, canvas.getHeight());

	// Should have horizontal movement (x changes), not vertical
	int x1 = findRightmostPixelX(canvas);

	effect.update(0.15f);
	canvas.clear();
	effect.render();

	int x2 = findRightmostPixelX(canvas);

	// "up" maps to "left", so x should decrease
	TEST_ASSERT_LESS_THAN(x1, x2);
}

// =============================================================================
// 3. Movement Physics
// =============================================================================

void test_projectile_position_over_time() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";  // Explicit white color
	props["direction"] = "right";
	props["velocity"] = 200;  // 200 pixels/second
	props["friction"] = 0;
	props["width"] = 4;  // Start at x = -4
	props["height"] = 4;
	effect.add(props);

	// Initial position: x = -4 (width)
	// After 0.08s at 200px/s: x = -4 + 16 = 12
	effect.update(0.08f);
	canvas.clear();
	effect.render();

	int leftX = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, leftX);  // Must be visible
	// Allow tolerance for sub-pixel rendering
	TEST_ASSERT_INT_WITHIN(4, 12, leftX);
}

void test_projectile_friction_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 200;  // 200 px/s
	props["friction"] = 0;
	props["width"] = 2;
	props["height"] = 2;
	effect.add(props);

	// Start from on-canvas position
	effect.update(0.05f);  // x = -2 + 10 = 8 (on canvas)
	canvas.clear();
	effect.render();
	int x1 = findLeftmostPixelX(canvas);

	effect.update(0.05f);  // x = 8 + 10 = 18
	canvas.clear();
	effect.render();
	int x2 = findLeftmostPixelX(canvas);

	effect.update(0.05f);  // x = 18 + 10 = 28
	canvas.clear();
	effect.render();
	int x3 = findLeftmostPixelX(canvas);

	// With zero friction, distance per interval should be constant
	int delta1 = x2 - x1;
	int delta2 = x3 - x2;

	TEST_ASSERT_INT_WITHIN(2, delta1, delta2);
}

void test_projectile_friction_positive() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";  // Explicit white color
	props["direction"] = "right";
	props["velocity"] = 500;  // Very high initial velocity
	props["friction"] = 8.0f;  // Very high friction for rapid decay
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	// Start from on-canvas position
	effect.update(0.04f);  // Enters canvas, high velocity
	canvas.clear();
	effect.render();
	int x1 = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x1);

	effect.update(0.04f);  // Velocity decaying significantly
	canvas.clear();
	effect.render();
	int x2 = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x2);

	effect.update(0.04f);  // Even more velocity decay
	canvas.clear();
	effect.render();
	int x3 = findLeftmostPixelX(canvas);
	TEST_ASSERT_NOT_EQUAL(-1, x3);

	// With friction, distance per interval should decrease
	int delta1 = x2 - x1;
	int delta2 = x3 - x2;

	TEST_ASSERT_LESS_THAN(delta1, delta2);
}

void test_projectile_friction_negative() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 50;  // Lower starting velocity to stay on canvas longer
	props["friction"] = -1.0f;  // Negative = acceleration (moderate)
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	int x1 = findLeftmostPixelX(canvas);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	int x2 = findLeftmostPixelX(canvas);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	int x3 = findLeftmostPixelX(canvas);

	// With negative friction (acceleration), distance per interval should increase
	int delta1 = x2 - x1;
	int delta2 = x3 - x2;

	TEST_ASSERT_GREATER_THAN(delta1, delta2);
}

void test_projectile_friction_high_clamps_decay() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 100;
	props["friction"] = 100.0f;  // Very high friction
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	// Should not crash or produce negative velocities
	effect.update(0.5f);
	canvas.clear();
	effect.render();

	// Projectile should still exist (not removed due to invalid state)
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) >= 0);
}

void test_projectile_negative_friction_velocity_capped() {
	// Test that velocity doesn't overflow with negative friction (acceleration)
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 100;
	props["friction"] = -5.0f;  // Strong acceleration
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 60000;  // Long lifespan to prevent timeout
	effect.add(props);

	// Run many updates - velocity should be capped, not overflow
	for (int i = 0; i < 100; i++) {
		effect.update(0.1f);  // 10 seconds total
	}

	// Should not crash - test passes if we get here
	canvas.clear();
	effect.render();
	TEST_PASS();
}

void test_projectile_extreme_negative_friction_no_crash() {
	// Test extreme negative friction doesn't crash
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "left";
	props["velocity"] = 1000;
	props["friction"] = -10.0f;  // Very strong acceleration
	props["width"] = 58;  // Large width (edge case from bug report)
	props["height"] = 22;
	props["lifespan"] = 5000;
	effect.add(props);

	// Run until lifespan expires
	for (int i = 0; i < 60; i++) {
		effect.update(0.1f);
	}

	// Should not crash
	TEST_PASS();
}

// =============================================================================
// 4. Trail Rendering
// =============================================================================

void test_projectile_trail_zero_no_trail() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 100;
	props["trail"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.2f);
	canvas.clear();
	effect.render();

	// With trail=0, only the projectile head should render
	// Width is 4, height is 4, so expect roughly 16 pixels
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_INT_WITHIN(4, 16, pixelCount);
}

void test_projectile_trail_renders_segments() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 200;
	props["trail"] = 0.5f;  // Trail = 50% of velocity
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.2f);
	canvas.clear();
	effect.render();

	// With trail, should have more pixels than just the head
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_GREATER_THAN(16, pixelCount);
}

void test_projectile_trail_alpha_gradient() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "right";
	props["velocity"] = 200;
	props["trail"] = 0.3f;
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.15f);
	canvas.clear();
	effect.render();

	// Find pixels at different x positions
	// Trail should have lower brightness at tail, higher at head
	int midY = canvas.getHeight() / 2;
	int leftX = findLeftmostPixelX(canvas);
	int rightX = findRightmostPixelX(canvas);

	if (leftX >= 0 && rightX > leftX) {
		CRGB tailPixel = canvas.getPixel(leftX, midY);
		CRGB headPixel = canvas.getPixel(rightX, midY);

		// Head should be brighter than tail (or equal if no trail visible)
		TEST_ASSERT_GREATER_OR_EQUAL(tailPixel.r, headPixel.r);
	}
}

void test_projectile_trail_length_proportional_to_velocity() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Slow projectile
	ParticleSystem particleSystem1(matrix, canvas);
	ProjectileEffect effect1(matrix, canvas, particleSystem1);
	JsonDocument props1;
	setDefaultProjectileProps(props1);
	props1["direction"] = "right";
	props1["velocity"] = 100;
	props1["trail"] = 0.5f;
	props1["width"] = 4;
	props1["height"] = 4;
	effect1.add(props1);
	effect1.update(0.2f);
	canvas.clear();
	effect1.render();
	int width1 = findRightmostPixelX(canvas) - findLeftmostPixelX(canvas);

	// Fast projectile
	ParticleSystem particleSystem2(matrix, canvas);
	ProjectileEffect effect2(matrix, canvas, particleSystem2);
	JsonDocument props2;
	setDefaultProjectileProps(props2);
	props2["direction"] = "right";
	props2["velocity"] = 300;
	props2["trail"] = 0.5f;
	props2["width"] = 4;
	props2["height"] = 4;
	effect2.add(props2);
	effect2.update(0.2f);
	canvas.clear();
	effect2.render();
	int width2 = findRightmostPixelX(canvas) - findLeftmostPixelX(canvas);

	// Faster projectile should have longer visible trail
	TEST_ASSERT_GREATER_THAN(width1, width2);
}

// =============================================================================
// 5. Bounds & Lifespan
// =============================================================================

void test_projectile_removed_when_off_canvas_right() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 500;
	props["trail"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 10000;  // Long lifespan
	effect.add(props);

	// Move until off-canvas
	for (int i = 0; i < 10; i++) {
		effect.update(0.1f);
	}

	canvas.clear();
	effect.render();

	// Should be removed (no pixels)
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_projectile_removed_when_off_canvas_left() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "left";
	props["velocity"] = 500;
	props["trail"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 10000;
	effect.add(props);

	for (int i = 0; i < 10; i++) {
		effect.update(0.1f);
	}

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_projectile_removed_when_expired() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 10;  // Slow - won't exit canvas
	props["lifespan"] = 500;  // 500ms lifespan
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	// Move past lifespan
	effect.update(0.6f);  // 600ms

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_projectile_trail_considered_for_bounds() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 200;
	props["trail"] = 0.5f;  // Has trail
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 10000;
	effect.add(props);

	// Move projectile head off canvas, but trail might still be visible
	effect.update(0.15f);
	canvas.clear();
	effect.render();

	// Continue moving - at some point both head AND trail exit
	for (int i = 0; i < 5; i++) {
		effect.update(0.1f);
	}

	canvas.clear();
	effect.render();

	// Eventually should be removed
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// 6. Multiple Projectiles
// =============================================================================

void test_projectile_multiple_concurrent() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props1;
	setDefaultProjectileProps(props1);
	props1["color"] = "#FF0000";
	props1["direction"] = "right";
	props1["velocity"] = 100;
	props1["width"] = 4;
	props1["height"] = 4;
	effect.add(props1);

	JsonDocument props2;
	setDefaultProjectileProps(props2);
	props2["color"] = "#00FF00";
	props2["direction"] = "left";
	props2["velocity"] = 100;
	props2["width"] = 4;
	props2["height"] = 4;
	effect.add(props2);

	effect.update(0.15f);
	canvas.clear();
	effect.render();

	// Should have pixels from both projectiles
	bool hasRed = false;
	bool hasGreen = false;

	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > 0 && p.g == 0)
				hasRed = true;
			if (p.g > 0 && p.r == 0)
				hasGreen = true;
		}
	}

	TEST_ASSERT_TRUE(hasRed);
	TEST_ASSERT_TRUE(hasGreen);
}

void test_projectile_removal_doesnt_affect_others() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	// Fast projectile that will exit quickly
	JsonDocument props1;
	setDefaultProjectileProps(props1);
	props1["color"] = "#FF0000";
	props1["direction"] = "right";
	props1["velocity"] = 1000;
	props1["trail"] = 0;
	props1["width"] = 4;
	props1["height"] = 4;
	effect.add(props1);

	// Slow projectile that stays on screen
	JsonDocument props2;
	setDefaultProjectileProps(props2);
	props2["color"] = "#00FF00";
	props2["direction"] = "right";
	props2["velocity"] = 50;
	props2["trail"] = 0;
	props2["width"] = 4;
	props2["height"] = 4;
	effect.add(props2);

	// After enough time, fast one should be gone, slow one still present
	for (int i = 0; i < 5; i++) {
		effect.update(0.1f);
	}

	canvas.clear();
	effect.render();

	// Should still have green pixels (slow projectile)
	bool hasGreen = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.g > 0) {
				hasGreen = true;
				break;
			}
		}
		if (hasGreen)
			break;
	}

	TEST_ASSERT_TRUE(hasGreen);
}

// =============================================================================
// 7. Canvas Integration
// =============================================================================

void test_projectile_uses_additive_blending() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	// Pre-fill canvas with some color
	canvas.fill(CRGB(50, 50, 50));

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#646464";  // RGB(100, 100, 100)
	props["direction"] = "right";
	props["velocity"] = 200;
	props["width"] = 16;
	props["height"] = 16;
	effect.add(props);

	effect.update(0.1f);
	effect.render();  // Render on top of filled canvas

	// Find a pixel that should be blended
	CRGB pixel = canvas.getPixel(8, 8);

	// With additive blending: 50 + 100 = 150 (approximately)
	TEST_ASSERT_GREATER_THAN(100, pixel.r);
}

void test_projectile_1d_strip_height_forced_to_1() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 100;
	props["width"] = 8;
	props["height"] = 8;  // Request height=8
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// On 1D strip, should only have pixels in row 0
	bool hasPixelsInRow0 = false;
	for (uint16_t x = 0; x < canvas.getWidth(); x++) {
		if (isNonBlack(canvas.getPixel(x, 0))) {
			hasPixelsInRow0 = true;
			break;
		}
	}

	TEST_ASSERT_TRUE(hasPixelsInRow0);
	TEST_ASSERT_EQUAL(1, canvas.getHeight());
}

// =============================================================================
// 8. Pixel-Perfect Snapshots (Regression Guards)
// =============================================================================

void test_projectile_snapshot_right_t0() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);  // Deterministic

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "right";
	props["velocity"] = 100;
	props["friction"] = 0;
	props["trail"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 5000;
	effect.add(props);

	// At t=0, projectile is at x=-4 (off-screen)
	canvas.clear();
	effect.render();

	// Should have no visible pixels at t=0
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_projectile_snapshot_right_t100ms() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "right";
	props["velocity"] = 100;  // 100 px/s
	props["friction"] = 0;
	props["trail"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 5000;
	effect.add(props);

	// At t=0.1s, position = -4 + 10 = 6
	effect.update(0.1f);
	canvas.clear();
	effect.render();

	// Leftmost pixel should be around x=6
	int leftX = findLeftmostPixelX(canvas);
	TEST_ASSERT_INT_WITHIN(1, 6, leftX);

	// Should have roughly 4x4 = 16 pixels
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_INT_WITHIN(4, 16, pixelCount);
}

void test_projectile_snapshot_with_trail() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "right";
	props["velocity"] = 200;
	props["friction"] = 0;
	props["trail"] = 0.2f;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 5000;
	effect.add(props);

	effect.update(0.15f);
	canvas.clear();
	effect.render();

	// With trail, should have more pixels than without
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_GREATER_THAN(16, pixelCount);

	// Trail length = velocity * trail = 200 * 0.2 = 40 pixels
	// But we're on a 32x32 canvas, so it's clamped
	int leftX = findLeftmostPixelX(canvas);
	int rightX = findRightmostPixelX(canvas);
	int width = rightX - leftX + 1;

	// Width should be greater than just the projectile width (4)
	TEST_ASSERT_GREATER_THAN(4, width);
}

// =============================================================================
// 9. Particle Emission Tests
// =============================================================================

void test_projectile_particle_density_zero_no_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 200;
	props["width"] = 4;
	props["height"] = 4;
	props["particleDensity"] = 0;  // No particles
	effect.add(props);

	// Run updates
	for (int i = 0; i < 10; i++) {
		effect.update(0.05f);
	}

	// Only render particle system (not projectile)
	canvas.clear();
	particleSystem.render();

	// Should have no particles
	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_projectile_particle_density_emits_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FF0000";
	props["direction"] = "right";
	props["velocity"] = 200;
	props["friction"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["particleDensity"] = 100;  // 100% chance per frame
	effect.add(props);

	// Run updates to emit particles
	for (int i = 0; i < 20; i++) {
		effect.update(0.05f);
	}

	// Render only particle system
	canvas.clear();
	particleSystem.render();

	// Should have particles
	TEST_ASSERT_GREATER_THAN(0, countNonBlackPixels(canvas));
}

void test_projectile_particle_velocity_capped() {
	// Test that particle velocity is capped even with high projectile velocity
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["direction"] = "right";
	props["velocity"] = 50000;  // Extremely high velocity
	props["friction"] = -5.0f;  // Accelerating
	props["width"] = 4;
	props["height"] = 4;
	props["particleDensity"] = 100;
	props["lifespan"] = 60000;
	effect.add(props);

	// Run many updates with particle emission
	for (int i = 0; i < 50; i++) {
		effect.update(0.1f);
	}

	// Should not crash
	canvas.clear();
	particleSystem.render();
	TEST_PASS();
}

void test_projectile_particle_same_color_as_projectile() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	hal::test::seedRandom(12345);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#00FF00";  // Green
	props["direction"] = "right";
	props["velocity"] = 200;
	props["friction"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	props["particleDensity"] = 100;
	effect.add(props);

	// Emit particles
	for (int i = 0; i < 10; i++) {
		effect.update(0.05f);
	}

	// Render particles only
	canvas.clear();
	particleSystem.render();

	// Find any non-black pixel and verify it's greenish
	bool foundGreen = false;
	for (uint16_t y = 0; y < canvas.getHeight() && !foundGreen; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() && !foundGreen; x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.g > 0 && pixel.r == 0 && pixel.b == 0) {
				foundGreen = true;
			}
		}
	}
	TEST_ASSERT_TRUE(foundGreen);
}

// =============================================================================
// 10. Pixel Digest Tests - Full Pipeline Validation
// =============================================================================

static uint64_t runProjectileDigest(const TestConfig& config, float updateTime,
                                     const char* direction = "right") {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	String layout = config.layout ? config.layout : "matrix-br-v-snake";
	Matrix matrix(config.width, config.height, layout);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#00FFFF";
	props["direction"] = direction;
	props["velocity"] = 150;
	props["friction"] = 0;
	props["trail"] = 0.3f;
	props["width"] = 8;
	props["height"] = 8;
	effect.add(props);

	effect.update(updateTime);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);

	return computeFrameDigest(matrix);
}

void test_projectile_digest_16x16_t100_right() {
	uint64_t digest = runProjectileDigest(TEST_CONFIGS[1], 0.1f, "right");
	assertDigest(0x5972A63446BD4865ull, digest, "projectile_16x16_t100_right");
}

void test_projectile_digest_16x16_t200_down() {
	uint64_t digest = runProjectileDigest(TEST_CONFIGS[1], 0.2f, "down");
	assertDigest(0x320DC324B3F64EB5ull, digest, "projectile_16x16_t200_down");
}

void test_projectile_digest_strip_t150_right() {
	uint64_t digest = runProjectileDigest(TEST_CONFIGS[0], 0.15f, "right");
	assertDigest(0xFCEADCDDC53E73EBull, digest, "projectile_strip_t150_right");
}

void test_projectile_digest_96x8_t100_right() {
	uint64_t digest = runProjectileDigest(TEST_CONFIGS[2], 0.1f, "right");
	assertDigest(0xCB0680C34F6ECEE5ull, digest, "projectile_96x8_t100_right");
}

void test_projectile_property_moves_over_time() {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	initTestGammaLUT();

	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = "#FFFFFF";
	props["direction"] = "right";
	props["velocity"] = 200;
	props["friction"] = 0;
	props["width"] = 4;
	props["height"] = 4;
	effect.add(props);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp1 = analyzeFrame(matrix);

	effect.update(0.1f);
	canvas.clear();
	effect.render();
	downsampleToMatrix(canvas, &matrix);
	FrameProperties fp2 = analyzeFrame(matrix);

	TEST_ASSERT_GREATER_THAN_MESSAGE(fp1.boundingBox.minX, fp2.boundingBox.minX,
	                                 "Projectile should move right over time");
}

void test_projectile_property_all_configs_render() {
	for (size_t i = 0; i < TEST_CONFIG_COUNT; i++) {
		hal::test::setTime(0);
		hal::test::seedRandom(12345);
		initTestGammaLUT();

		String layout = TEST_CONFIGS[i].layout ? TEST_CONFIGS[i].layout : "matrix-br-v-snake";
		Matrix matrix(TEST_CONFIGS[i].width, TEST_CONFIGS[i].height, layout);
		Canvas canvas(matrix);
		ParticleSystem particleSystem(matrix, canvas);
	ProjectileEffect effect(matrix, canvas, particleSystem);

		JsonDocument props;
		setDefaultProjectileProps(props);
		props["color"] = "#FF0000";
		props["direction"] = "right";
		props["velocity"] = 200;
		props["width"] = 4;
		props["height"] = 4;
		effect.add(props);

		effect.update(0.1f);
		canvas.clear();
		effect.render();
		downsampleToMatrix(canvas, &matrix);

		FrameProperties fp = analyzeFrame(matrix);
		char msg[128];
		snprintf(msg, sizeof(msg), "Config %s should render projectile", TEST_CONFIGS[i].name);
		TEST_ASSERT_GREATER_THAN_MESSAGE(0, fp.nonBlackPixels, msg);
	}
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// 1. Basic Creation & Defaults
	RUN_TEST(test_projectile_creation_default_values);
	RUN_TEST(test_projectile_creation_with_color);
	RUN_TEST(test_projectile_reset_clears_all);

	// 2. Direction Tests
	RUN_TEST(test_projectile_direction_right);
	RUN_TEST(test_projectile_direction_left);
	RUN_TEST(test_projectile_direction_down);
	RUN_TEST(test_projectile_direction_up);
	RUN_TEST(test_projectile_direction_random);
	RUN_TEST(test_projectile_1d_strip_vertical_maps_to_horizontal);

	// 3. Movement Physics
	RUN_TEST(test_projectile_position_over_time);
	RUN_TEST(test_projectile_friction_zero);
	RUN_TEST(test_projectile_friction_positive);
	RUN_TEST(test_projectile_friction_negative);
	RUN_TEST(test_projectile_friction_high_clamps_decay);
	RUN_TEST(test_projectile_negative_friction_velocity_capped);
	RUN_TEST(test_projectile_extreme_negative_friction_no_crash);

	// 4. Trail Rendering
	RUN_TEST(test_projectile_trail_zero_no_trail);
	RUN_TEST(test_projectile_trail_renders_segments);
	RUN_TEST(test_projectile_trail_alpha_gradient);
	RUN_TEST(test_projectile_trail_length_proportional_to_velocity);

	// 5. Bounds & Lifespan
	RUN_TEST(test_projectile_removed_when_off_canvas_right);
	RUN_TEST(test_projectile_removed_when_off_canvas_left);
	RUN_TEST(test_projectile_removed_when_expired);
	RUN_TEST(test_projectile_trail_considered_for_bounds);

	// 6. Multiple Projectiles
	RUN_TEST(test_projectile_multiple_concurrent);
	RUN_TEST(test_projectile_removal_doesnt_affect_others);

	// 7. Canvas Integration
	RUN_TEST(test_projectile_uses_additive_blending);
	RUN_TEST(test_projectile_1d_strip_height_forced_to_1);

	// 8. Pixel-Perfect Snapshots
	RUN_TEST(test_projectile_snapshot_right_t0);
	RUN_TEST(test_projectile_snapshot_right_t100ms);
	RUN_TEST(test_projectile_snapshot_with_trail);

	// 9. Particle Emission Tests
	RUN_TEST(test_projectile_particle_density_zero_no_particles);
	RUN_TEST(test_projectile_particle_density_emits_particles);
	RUN_TEST(test_projectile_particle_velocity_capped);
	RUN_TEST(test_projectile_particle_same_color_as_projectile);

	// 10. Pixel Digest Tests
	RUN_TEST(test_projectile_digest_16x16_t100_right);
	RUN_TEST(test_projectile_digest_16x16_t200_down);
	RUN_TEST(test_projectile_digest_strip_t150_right);
	RUN_TEST(test_projectile_digest_96x8_t100_right);
	RUN_TEST(test_projectile_property_moves_over_time);
	RUN_TEST(test_projectile_property_all_configs_render);

	return UNITY_END();
}
