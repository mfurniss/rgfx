/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Unit tests for ParticleSystem active count tracking optimization.
 * Tests verify the activeCount member correctly tracks live particles
 * for early-exit optimization in update() and render().
 */

#include <unity.h>
#include <cstdint>
#include <cstring>

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

// Include particle system
#include "effects/particle_system.h"
#include "effects/particle_system.cpp"

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// Helper to create a test particle
Particle createTestParticle(float x, float y, uint32_t lifespan = 1000) {
	Particle p;
	p.x = x;
	p.y = y;
	p.vx = 10.0f;
	p.vy = 10.0f;
	p.r = 255;
	p.g = 0;
	p.b = 0;
	p.alpha = 255;
	p.lifespan = lifespan;
	p.age = 0;
	p.friction = 0.5f;
	p.gravity = 0.0f;
	p.size = 2;
	return p;
}

// =============================================================================
// Active Count Tracking Tests
// =============================================================================

void test_initial_active_count_is_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

void test_adding_particle_increments_active_count() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	ps.add(createTestParticle(16.0f, 16.0f));
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());

	ps.add(createTestParticle(20.0f, 20.0f));
	TEST_ASSERT_EQUAL(2, ps.getActiveCount());

	ps.add(createTestParticle(24.0f, 24.0f));
	TEST_ASSERT_EQUAL(3, ps.getActiveCount());
}

void test_particle_death_decrements_active_count() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add particle with short lifespan
	ps.add(createTestParticle(16.0f, 16.0f, 100));  // 100ms lifespan
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());

	// Update past lifespan
	ps.update(0.2f);  // 200ms - past lifespan
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

void test_reset_sets_active_count_to_zero() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add several particles
	ps.add(createTestParticle(16.0f, 16.0f));
	ps.add(createTestParticle(20.0f, 20.0f));
	ps.add(createTestParticle(24.0f, 24.0f));
	TEST_ASSERT_EQUAL(3, ps.getActiveCount());

	// Reset should clear all
	ps.reset();
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

void test_overwriting_dead_particle_increments_count() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add particle with short lifespan
	ps.add(createTestParticle(16.0f, 16.0f, 50));
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());

	// Kill it
	ps.update(0.1f);  // 100ms
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());

	// Add new particle (will overwrite dead slot eventually as circular buffer wraps)
	// For this test, add 500 particles to ensure we wrap and overwrite
	for (int i = 0; i < 500; i++) {
		ps.add(createTestParticle(16.0f, 16.0f, 50));
	}
	// Kill them all
	ps.update(0.1f);
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());

	// Now add one more - it should overwrite a dead slot
	ps.add(createTestParticle(16.0f, 16.0f));
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());
}

void test_multiple_particles_dying_over_time() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add particles with staggered lifespans
	Particle p1 = createTestParticle(16.0f, 16.0f, 100);
	Particle p2 = createTestParticle(20.0f, 20.0f, 200);
	Particle p3 = createTestParticle(24.0f, 24.0f, 300);

	ps.add(p1);
	ps.add(p2);
	ps.add(p3);
	TEST_ASSERT_EQUAL(3, ps.getActiveCount());

	// After 150ms, first should be dead
	ps.update(0.15f);
	TEST_ASSERT_EQUAL(2, ps.getActiveCount());

	// After another 100ms (250ms total), second should be dead
	ps.update(0.10f);
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());

	// After another 100ms (350ms total), third should be dead
	ps.update(0.10f);
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

void test_out_of_bounds_particle_decrements_count() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add particle moving fast to the right (will go out of bounds)
	Particle p = createTestParticle(30.0f, 16.0f, 10000);  // Long lifespan
	p.vx = 100.0f;  // Very fast
	p.friction = 0.0f;  // No friction so it keeps moving
	ps.add(p);
	TEST_ASSERT_EQUAL(1, ps.getActiveCount());

	// Update until particle is out of bounds
	ps.update(1.0f);  // Should move 100 pixels, way out of canvas
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

// =============================================================================
// Early Exit Optimization Tests
// =============================================================================

void test_update_early_exits_when_no_active_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// With no particles, update should return immediately
	// We can't directly test early exit, but we can verify it doesn't crash
	// and maintains correct state
	ps.update(0.016f);
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());

	ps.update(1.0f);
	TEST_ASSERT_EQUAL(0, ps.getActiveCount());
}

void test_render_early_exits_when_no_active_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	canvas.clear();

	// With no particles, render should return immediately
	ps.render();

	// Canvas should remain black
	bool allBlack = true;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r != 0 || pixel.g != 0 || pixel.b != 0) {
				allBlack = false;
				break;
			}
		}
	}
	TEST_ASSERT_TRUE(allBlack);
}

void test_render_draws_when_particles_active() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);
	ParticleSystem ps(matrix, canvas);

	// Add particle in visible area
	Particle p = createTestParticle(16.0f, 16.0f);
	ps.add(p);

	canvas.clear();
	ps.render();

	// Should have some non-black pixels
	bool hasNonBlack = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r != 0 || pixel.g != 0 || pixel.b != 0) {
				hasNonBlack = true;
				break;
			}
		}
	}
	TEST_ASSERT_TRUE(hasNonBlack);
}

// =============================================================================
// Test Runner
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Active count tracking tests
	RUN_TEST(test_initial_active_count_is_zero);
	RUN_TEST(test_adding_particle_increments_active_count);
	RUN_TEST(test_particle_death_decrements_active_count);
	RUN_TEST(test_reset_sets_active_count_to_zero);
	RUN_TEST(test_overwriting_dead_particle_increments_count);
	RUN_TEST(test_multiple_particles_dying_over_time);
	RUN_TEST(test_out_of_bounds_particle_decrements_count);

	// Early exit optimization tests
	RUN_TEST(test_update_early_exits_when_no_active_particles);
	RUN_TEST(test_render_early_exits_when_no_active_particles);
	RUN_TEST(test_render_draws_when_particles_active);

	return UNITY_END();
}
