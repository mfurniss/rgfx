/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for PulseEffect
 *
 * Tests the pulse effect rendering using the real implementation.
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
#include "effects/pulse.h"
#include "effects/pulse.cpp"

// Helper to check if pixel is non-black
static bool isNonBlack(const CRGB& p) {
	return p.r != 0 || p.g != 0 || p.b != 0;
}

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

void test_pulse_creation_default_values() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	effect.add(props);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Default color is white (#FFFFFF)
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

void test_pulse_creation_with_color() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["collapse"] = "none";
	effect.add(props);
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_fade_over_time() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// After 50% time with fade, color should be blended (darker red)
	TEST_ASSERT_LESS_THAN(255, pixel.r);
	TEST_ASSERT_GREATER_THAN(0, pixel.r);
}

void test_pulse_fade_completes() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(1.1f);  // Past duration
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	// Pulse should be gone
	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_non_fading_stays_full_brightness() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 2000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_non_fading_expires() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(1.1f);  // Past duration
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_multiple_pulses_exist() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["fade"] = false;
	props1["collapse"] = "none";
	effect.add(props1);

	JsonDocument props2;
	props2["color"] = "#0000FF";
	props2["fade"] = false;
	props2["collapse"] = "none";
	effect.add(props2);

	canvas.clear();
	effect.update(0.016f);
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_TRUE(isNonBlack(pixel));
}

void test_pulse_reset_clears_all() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["collapse"] = "none";
	effect.add(props);

	effect.reset();
	canvas.clear();
	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(0, pixel.b);
}

void test_pulse_canvas_size_matches_matrix() {
	Matrix matrix(8, 8);
	Canvas canvas(matrix);

	// Canvas is 4x matrix size
	TEST_ASSERT_EQUAL(32, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
}

void test_pulse_collapse_none_fills_canvas() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	canvas.clear();
	effect.update(0.016f);
	effect.render();

	// All corners should be filled (canvas is 16x16 for 4x4 matrix)
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(0, 0).r);
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(15, 0).r);
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(0, 15).r);
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(15, 15).r);
}

void test_pulse_collapse_horizontal_shrinks_height() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "horizontal";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);  // 50% through duration
	effect.render();

	// Center should be filled
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(8, 8).r);

	// Top and bottom edges should be empty (shrunk toward center)
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(8, 0).r);
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(8, 15).r);
}

void test_pulse_collapse_vertical_shrinks_width() {
	Matrix matrix(4, 4);
	Canvas canvas(matrix);
	PulseEffect effect(matrix, canvas);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "vertical";
	effect.add(props);

	canvas.clear();
	effect.update(0.5f);  // 50% through duration
	effect.render();

	// Center should be filled
	TEST_ASSERT_EQUAL_UINT8(255, canvas.getPixel(8, 8).r);

	// Left and right edges should be empty (shrunk toward center)
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(0, 8).r);
	TEST_ASSERT_EQUAL_UINT8(0, canvas.getPixel(15, 8).r);
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();
	RUN_TEST(test_pulse_creation_default_values);
	RUN_TEST(test_pulse_creation_with_color);
	RUN_TEST(test_pulse_fade_over_time);
	RUN_TEST(test_pulse_fade_completes);
	RUN_TEST(test_pulse_non_fading_stays_full_brightness);
	RUN_TEST(test_pulse_non_fading_expires);
	RUN_TEST(test_pulse_multiple_pulses_exist);
	RUN_TEST(test_pulse_reset_clears_all);
	RUN_TEST(test_pulse_canvas_size_matches_matrix);
	RUN_TEST(test_pulse_collapse_none_fills_canvas);
	RUN_TEST(test_pulse_collapse_horizontal_shrinks_height);
	RUN_TEST(test_pulse_collapse_vertical_shrinks_width);
	return UNITY_END();
}
