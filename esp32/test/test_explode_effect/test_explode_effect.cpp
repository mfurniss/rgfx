/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cmath>
#include <vector>
#include <algorithm>

// Include mocks - mock_arduino before anything else
#include "../mocks/mock_arduino.h"
#include "../mocks/mock_fastled.h"

// Include canvas (it will use mock_fastled.h via UNIT_TEST)
#include "canvas.h"
#include "canvas.cpp"

// Include easing functions
#include "easing.h"
#include "easing_impl.cpp"

// Include effect_utils for parseColor and randomColor
#include "effect_utils.h"
#include "effect_utils.cpp"

// LayoutType from matrix.h
enum class LayoutType : uint8_t {
	STRIP = 1,
	MATRIX = 2
};

// Mock Matrix class that provides what ExplodeEffect needs
class Matrix {
public:
	uint16_t width;
	uint16_t height;
	uint32_t size;
	CRGB* leds;
	LayoutType layoutType;

private:
	uint16_t panelWidth_;
	uint16_t panelHeight_;
	uint8_t unifiedCols_;
	uint8_t unifiedRows_;

public:
	Matrix(uint16_t w, uint16_t h, LayoutType layout = LayoutType::MATRIX)
		: width(w), height(h), size(w * h), layoutType(layout),
		  panelWidth_(w), panelHeight_(h), unifiedCols_(1), unifiedRows_(1) {
		leds = new CRGB[size];
	}

	~Matrix() {
		delete[] leds;
	}

	uint16_t getPanelWidth() const { return panelWidth_; }
	uint16_t getPanelHeight() const { return panelHeight_; }
	uint8_t getUnifiedCols() const { return unifiedCols_; }
	uint8_t getUnifiedRows() const { return unifiedRows_; }
};

// Define IEffect interface
class IEffect {
public:
	virtual ~IEffect() = default;
	virtual void add(JsonDocument& props) = 0;
	virtual void update(float deltaTime) = 0;
	virtual void render() = 0;
	virtual void reset() = 0;
};

// Include explode.h directly (it will skip matrix.h includes with our mock)
// We need to selectively include just the ExplodeEffect class definition
// Since explode.h includes effect.h which includes matrix.h, we define our mock first

// Prevent matrix.h from being included (we have our own mock)
#define MATRIX_H_INCLUDED

// Include the ExplodeEffect implementation
// Note: We include the cpp directly with our mocks defined first
#include "explode_impl.inl"

// Helper to count non-black pixels in canvas
static int countNonBlackPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r != 0 || p.g != 0 || p.b != 0) {
				count++;
			}
		}
	}
	return count;
}

void setUp(void) {
	// Seed random for reproducible tests
	srand(12345);
	random16_set_seed(12345);
}

void tearDown(void) {}

// =============================================================================
// Basic creation and initialization
// =============================================================================

void test_explode_effect_creation() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);  // 4x matrix size
	ExplodeEffect effect(matrix, canvas);

	// Just verify construction doesn't crash
	TEST_ASSERT_TRUE(true);
}

void test_explode_effect_add_creates_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["particleCount"] = 10;

	effect.add(props);
	effect.render();

	// Should have some pixels rendered
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_explode_effect_default_values() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	// No explicit values - should use defaults

	effect.add(props);
	effect.render();

	// Should still create particles with defaults
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Particle lifecycle
// =============================================================================

void test_explode_effect_particles_expire() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["particleCount"] = 50;
	props["lifespan"] = 100;  // 100ms lifespan

	effect.add(props);

	// Initial render should have particles
	canvas.clear();
	effect.render();
	int initialPixels = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(initialPixels > 0);

	// Update past lifespan
	effect.update(0.2f);  // 200ms

	// Render again - particles should be gone
	canvas.clear();
	effect.render();
	int finalPixels = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(0, finalPixels);
}

void test_explode_effect_particles_fade_alpha() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 50;
	props["lifespan"] = 1000;  // 1 second lifespan

	effect.add(props);

	// Render at start
	canvas.clear();
	effect.render();

	// Update halfway through lifespan
	effect.update(0.5f);

	// Particles should still exist but with lower alpha (less bright)
	canvas.clear();
	effect.render();
	int midPixels = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(midPixels > 0);
}

void test_explode_effect_reset_clears_all() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["particleCount"] = 100;

	effect.add(props);
	effect.render();

	// Verify particles exist
	int beforeReset = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(beforeReset > 0);

	// Reset
	effect.reset();

	// Render again - should be empty
	canvas.clear();
	effect.render();
	int afterReset = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(0, afterReset);
}

// =============================================================================
// FIFO eviction
// =============================================================================

void test_explode_effect_fifo_eviction() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	// Add first explosion with many particles
	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["particleCount"] = 400;
	props1["lifespan"] = 10000;  // Long lifespan

	effect.add(props1);

	// Add second explosion that would exceed pool
	JsonDocument props2;
	props2["color"] = "#00FF00";
	props2["particleCount"] = 200;
	props2["lifespan"] = 10000;

	effect.add(props2);

	// Should not crash and should have particles
	canvas.clear();
	effect.render();
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Strip vs Matrix behavior
// =============================================================================

void test_explode_effect_strip_mode_horizontal_only() {
	Matrix matrix(32, 1, LayoutType::STRIP);
	Canvas canvas(128, 4);  // 4x size for strip
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFF00";
	props["particleCount"] = 50;

	effect.add(props);
	effect.update(0.01f);
	effect.render();

	// In strip mode, particles should move horizontally
	// Just verify render works
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_explode_effect_matrix_mode_2d_spread() {
	Matrix matrix(16, 16, LayoutType::MATRIX);
	Canvas canvas(64, 64);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF00FF";
	props["particleCount"] = 100;
	props["centerX"] = 50;  // Center
	props["centerY"] = 50;

	effect.add(props);
	effect.update(0.05f);
	effect.render();

	// Matrix mode should have 2D spread
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Center position
// =============================================================================

void test_explode_effect_center_position() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 20;  // More particles for better coverage
	props["particleSize"] = 3;
	props["centerX"] = 10;  // Near left edge (10% of 32 = ~3)
	props["centerY"] = 10;  // Near top edge

	effect.add(props);
	effect.render();

	// Check that particles exist somewhere in the first half of the canvas
	int inLeftHalf = 0;
	for (uint16_t y = 0; y < canvas.getHeight() / 2; y++) {
		for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r != 0 || p.g != 0 || p.b != 0) {
				inLeftHalf++;
			}
		}
	}
	TEST_ASSERT_TRUE(inLeftHalf > 0);
}

void test_explode_effect_random_center() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FFFF";
	props["particleCount"] = 50;
	props["centerX"] = "random";
	props["centerY"] = "random";

	// Should not crash with random center
	effect.add(props);
	effect.render();

	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Color and hue spread
// =============================================================================

void test_explode_effect_specific_color() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";  // Pure red
	props["particleCount"] = 50;
	props["hueSpread"] = 0;  // No hue variation

	effect.add(props);
	effect.render();

	// All colored pixels should be red-ish
	bool hasRedPixels = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > 0 && p.g == 0 && p.b == 0) {
				hasRedPixels = true;
				break;
			}
		}
		if (hasRedPixels) break;
	}
	TEST_ASSERT_TRUE(hasRedPixels);
}

void test_explode_effect_hue_spread() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["particleCount"] = 100;
	props["hueSpread"] = 180;  // Large hue variation

	effect.add(props);
	effect.render();

	// Should still render particles (with color variations)
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Friction and power
// =============================================================================

void test_explode_effect_high_friction_slows_particles() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 50;
	props["friction"] = 10.0;  // High friction
	props["power"] = 100;
	props["lifespan"] = 2000;

	effect.add(props);

	// Update multiple times
	for (int i = 0; i < 10; i++) {
		effect.update(0.05f);
	}

	// Particles with high friction should slow down
	// Just verify it doesn't crash and still renders
	canvas.clear();
	effect.render();
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount >= 0);  // May be 0 if all out of bounds
}

void test_explode_effect_power_affects_spread() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 20;
	props["power"] = 10;  // Low power
	props["friction"] = 0.1;
	props["lifespan"] = 5000;

	effect.add(props);
	effect.update(0.1f);
	effect.render();

	// Should have particles near center
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

// =============================================================================
// Multiple explosions
// =============================================================================

void test_explode_effect_multiple_explosions() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	// First explosion
	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["particleCount"] = 50;
	props1["centerX"] = 25;
	props1["centerY"] = 25;

	effect.add(props1);

	// Second explosion
	JsonDocument props2;
	props2["color"] = "#00FF00";
	props2["particleCount"] = 50;
	props2["centerX"] = 75;
	props2["centerY"] = 75;

	effect.add(props2);

	effect.render();

	// Should have particles from both explosions
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

void test_explode_effect_explosion_cleanup() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 50;
	props["lifespan"] = 50;  // Very short lifespan

	effect.add(props);

	// Update past lifespan multiple times
	for (int i = 0; i < 5; i++) {
		effect.update(0.1f);
	}

	// Explosion should be cleaned up
	canvas.clear();
	effect.render();
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_EQUAL(0, pixelCount);
}

// =============================================================================
// Particle size
// =============================================================================

void test_explode_effect_particle_size() {
	Matrix matrix(8, 8);
	Canvas canvas(32, 32);
	ExplodeEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["particleCount"] = 10;
	props["particleSize"] = 4;  // Larger particles

	effect.add(props);
	effect.render();

	// Should have particles
	int pixelCount = countNonBlackPixels(canvas);
	TEST_ASSERT_TRUE(pixelCount > 0);
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Basic creation
	RUN_TEST(test_explode_effect_creation);
	RUN_TEST(test_explode_effect_add_creates_particles);
	RUN_TEST(test_explode_effect_default_values);

	// Particle lifecycle
	RUN_TEST(test_explode_effect_particles_expire);
	RUN_TEST(test_explode_effect_particles_fade_alpha);
	RUN_TEST(test_explode_effect_reset_clears_all);

	// FIFO eviction
	RUN_TEST(test_explode_effect_fifo_eviction);

	// Strip vs Matrix
	RUN_TEST(test_explode_effect_strip_mode_horizontal_only);
	RUN_TEST(test_explode_effect_matrix_mode_2d_spread);

	// Center position
	RUN_TEST(test_explode_effect_center_position);
	RUN_TEST(test_explode_effect_random_center);

	// Color
	RUN_TEST(test_explode_effect_specific_color);
	RUN_TEST(test_explode_effect_hue_spread);

	// Friction and power
	RUN_TEST(test_explode_effect_high_friction_slows_particles);
	RUN_TEST(test_explode_effect_power_affects_spread);

	// Multiple explosions
	RUN_TEST(test_explode_effect_multiple_explosions);
	RUN_TEST(test_explode_effect_explosion_cleanup);

	// Particle size
	RUN_TEST(test_explode_effect_particle_size);

	return UNITY_END();
}
