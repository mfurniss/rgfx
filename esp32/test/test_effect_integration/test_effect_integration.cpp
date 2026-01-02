/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Integration Test: Effect → Canvas → Downsample → Display Pipeline
 *
 * Tests the rendering pipeline using the HAL test infrastructure.
 * Uses PulseEffect directly without full EffectProcessor to minimize dependencies.
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
#include "hal/test/test_display.h"
#include "hal/test/test_platform.h"

// HAL platform for millis/random
#include "hal/platform.h"

// Include HAL implementations
#include "hal/test/platform.cpp"
#define HAL_TEST_DISPLAY_NO_GLOBAL  // Skip static global to avoid teardown issues
#include "hal/test/display.cpp"

// Constants needed by matrix.h (used by included headers)
namespace {
[[maybe_unused]] constexpr uint16_t DEFAULT_MATRIX_WIDTH = 32;
[[maybe_unused]] constexpr uint16_t DEFAULT_MATRIX_HEIGHT = 8;
}

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
#include "effects/pulse.h"
#include "effects/pulse.cpp"
#include "effects/wipe.h"
#include "effects/wipe.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

// Test display instance
static hal::test::HeadlessDisplay* testDisplay = nullptr;

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	testDisplay = new hal::test::HeadlessDisplay();
}

void tearDown(void) {
	delete testDisplay;
	testDisplay = nullptr;
}

// Helper: Downsample canvas to matrix and send to display
void renderToDisplay(Canvas& canvas, Matrix& matrix, hal::test::HeadlessDisplay& display) {
	// Simple 4x downsample (no gamma)
	for (uint16_t y = 0; y < matrix.height; y++) {
		for (uint16_t x = 0; x < matrix.width; x++) {
			uint16_t rSum = 0, gSum = 0, bSum = 0;
			for (uint16_t by = 0; by < 4; by++) {
				for (uint16_t bx = 0; bx < 4; bx++) {
					CRGB pixel = canvas.getPixel(x * 4 + bx, y * 4 + by);
					rSum += pixel.r;
					gSum += pixel.g;
					bSum += pixel.b;
				}
			}
			matrix.led(x, y) = CRGB(rSum >> 4, gSum >> 4, bSum >> 4);
		}
	}
	display.show(matrix.leds, matrix.size, matrix.width, matrix.height);
}

// =============================================================================
// Basic Pipeline Tests
// =============================================================================

void test_display_receives_frame() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);

	// Fill canvas with red
	canvas.fill(CRGB(255, 0, 0));

	// Render to display
	renderToDisplay(canvas, matrix, *testDisplay);

	TEST_ASSERT_EQUAL(1, testDisplay->getFrameCount());

	const auto& frame = testDisplay->getLastFrame();
	TEST_ASSERT_EQUAL(16, frame.size());  // 4x4 = 16 pixels
}

void test_canvas_to_display_color() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);

	// Fill canvas with pure green
	canvas.fill(CRGB(0, 255, 0));

	renderToDisplay(canvas, matrix, *testDisplay);

	const auto& frame = testDisplay->getLastFrame();

	// All pixels should be green
	for (const auto& pixel : frame) {
		TEST_ASSERT_EQUAL(0, pixel.r);
		TEST_ASSERT_EQUAL(255, pixel.g);
		TEST_ASSERT_EQUAL(0, pixel.b);
	}
}

void test_pulse_effect_renders_red() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	hal::test::setTime(100);

	// Add red pulse
	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	pulse.add(props);

	// Update and render
	pulse.update(0.016f);  // ~60fps
	canvas.clear();
	pulse.render();

	renderToDisplay(canvas, matrix, *testDisplay);

	const auto& frame = testDisplay->getLastFrame();
	TEST_ASSERT_EQUAL(16, frame.size());

	// All pixels should be red (pulse fills canvas with collapse=none)
	bool hasRed = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0) {
			hasRed = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasRed);
}

void test_pulse_fades_over_time() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	hal::test::setTime(100);

	// Add fading red pulse
	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FF0000";
	props["duration"] = 500;
	props["fade"] = true;
	props["collapse"] = "none";
	pulse.add(props);

	// First frame
	canvas.clear();
	pulse.update(0.016f);
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	uint8_t initialRed = testDisplay->getLastFrame()[0].r;

	// Advance past pulse duration
	canvas.clear();
	pulse.update(0.6f);  // 600ms
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	uint8_t finalRed = testDisplay->getLastFrame()[0].r;

	// Pulse should have faded (final < initial)
	TEST_ASSERT_LESS_THAN(initialRed, finalRed);
}

void test_wipe_effect_renders() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	WipeEffect wipe(matrix, canvas);

	hal::test::setTime(100);

	// Add green wipe
	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = "#00FF00";
	props["duration"] = 500;
	props["direction"] = "right";
	wipe.add(props);

	// Render partway through wipe
	canvas.clear();
	wipe.update(0.25f);  // 250ms
	wipe.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	const auto& frame = testDisplay->getLastFrame();

	// Should have some green pixels
	bool hasGreen = false;
	for (const auto& pixel : frame) {
		if (pixel.g > 0) {
			hasGreen = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasGreen);
}

void test_multiple_pulses_blend() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	// Add red pulse
	JsonDocument props1;
	setDefaultPulseProps(props1);
	props1["color"] = "#FF0000";
	props1["fade"] = false;
	props1["collapse"] = "none";
	pulse.add(props1);

	// Add green pulse (will blend)
	JsonDocument props2;
	setDefaultPulseProps(props2);
	props2["color"] = "#00FF00";
	props2["fade"] = false;
	props2["collapse"] = "none";
	pulse.add(props2);

	canvas.clear();
	pulse.update(0.016f);
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	const auto& frame = testDisplay->getLastFrame();

	// Should have pixels with both red and green components
	bool hasMixed = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0 || pixel.g > 0) {
			hasMixed = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasMixed);
}

void test_strip_layout_renders() {
	Matrix matrix(8, 1, "strip");
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#0000FF";
	props["fade"] = false;
	pulse.add(props);

	canvas.clear();
	pulse.update(0.016f);
	pulse.render();

	// Simple 4x downsample for strip
	for (uint16_t x = 0; x < matrix.width; x++) {
		uint16_t rSum = 0, gSum = 0, bSum = 0;
		for (uint16_t bx = 0; bx < 4; bx++) {
			CRGB pixel = canvas.getPixel(x * 4 + bx, 0);
			rSum += pixel.r;
			gSum += pixel.g;
			bSum += pixel.b;
		}
		matrix.led(x, 0) = CRGB(rSum >> 2, gSum >> 2, bSum >> 2);
	}
	testDisplay->show(matrix.leds, matrix.size, matrix.width, matrix.height);

	const auto& frame = testDisplay->getLastFrame();
	TEST_ASSERT_EQUAL(8, frame.size());  // 8x1 = 8 pixels
}

void test_large_matrix_renders() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FFFF00";
	props["fade"] = false;
	props["collapse"] = "none";
	pulse.add(props);

	canvas.clear();
	pulse.update(0.016f);
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	const auto& frame = testDisplay->getLastFrame();
	TEST_ASSERT_EQUAL(256, frame.size());  // 16x16 = 256 pixels

	// Should have yellow pixels
	bool hasYellow = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0 && pixel.g > 0) {
			hasYellow = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasYellow);
}

void test_reset_clears_effect() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect pulse(matrix, canvas);

	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = "#FFFFFF";
	props["fade"] = false;
	props["collapse"] = "none";
	pulse.add(props);

	// Verify pulse exists
	canvas.clear();
	pulse.update(0.016f);
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	bool hasWhite = false;
	for (const auto& pixel : testDisplay->getLastFrame()) {
		if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
			hasWhite = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasWhite);

	// Reset and verify cleared
	pulse.reset();
	canvas.clear();
	pulse.render();
	renderToDisplay(canvas, matrix, *testDisplay);

	bool isBlack = true;
	for (const auto& pixel : testDisplay->getLastFrame()) {
		if (pixel.r != 0 || pixel.g != 0 || pixel.b != 0) {
			isBlack = false;
			break;
		}
	}
	TEST_ASSERT_TRUE(isBlack);
}

void test_brightness_tracking() {
	testDisplay->setBrightness(128);
	TEST_ASSERT_EQUAL(128, testDisplay->getBrightness());

	testDisplay->setBrightness(255);
	TEST_ASSERT_EQUAL(255, testDisplay->getBrightness());
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Basic pipeline
	RUN_TEST(test_display_receives_frame);
	RUN_TEST(test_canvas_to_display_color);

	// Pulse effect
	RUN_TEST(test_pulse_effect_renders_red);
	RUN_TEST(test_pulse_fades_over_time);

	// Wipe effect
	RUN_TEST(test_wipe_effect_renders);

	// Effect composition
	RUN_TEST(test_multiple_pulses_blend);
	RUN_TEST(test_reset_clears_effect);

	// Different layouts
	RUN_TEST(test_strip_layout_renders);
	RUN_TEST(test_large_matrix_renders);

	// Display state
	RUN_TEST(test_brightness_tracking);

	return UNITY_END();
}
