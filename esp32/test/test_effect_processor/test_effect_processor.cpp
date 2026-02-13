/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for EffectProcessor
 *
 * Tests the central effect orchestrator: routing effects by name,
 * clearing all effects, frame loop behavior, test mode, and timing.
 *
 * This is the only test that instantiates the full EffectProcessor with
 * all 14 effects. Uses HeadlessDisplay for frame capture.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <algorithm>
#include <atomic>

// Standard library Arduino-like functions
#include <string>
using String = std::string;

// =============================================================================
// Mock driver_config.h — must be defined BEFORE anything includes it
// The real driver_config.h includes <Arduino.h> which doesn't exist natively.
// =============================================================================
#define DRIVER_CONFIG_H

struct LEDDeviceConfig {
	String id;
	uint8_t pin = 0;
	String layout;
	uint16_t count = 0;
	uint16_t offset = 0;
	String chipset;
	String colorOrder;
	uint8_t maxBrightness = 255;
	String colorCorrection;
	uint16_t width = 0;
	uint16_t height = 0;
	uint16_t panelWidth = 0;
	uint16_t panelHeight = 0;
	uint8_t unifiedRows = 1;
	uint8_t unifiedCols = 1;
	std::vector<uint8_t> panelOrder;
	std::vector<uint8_t> panelRotation;
	bool reverse = false;
	String rgbwMode = "exact";
};

struct DriverConfigData {
	String version;
	std::vector<LEDDeviceConfig> devices;
	uint8_t globalBrightnessLimit = 255;
	bool dithering = true;
	uint8_t updateRate = 120;
	uint8_t powerSupplyVolts = 5;
	uint16_t maxPowerMilliamps = 2000;
	float gammaR = 1.0f;
	float gammaG = 1.0f;
	float gammaB = 1.0f;
	uint8_t floorR = 0;
	uint8_t floorG = 0;
	uint8_t floorB = 0;
};

DriverConfigData g_driverConfig;
bool g_configReceived = false;
std::atomic<bool> g_configUpdateInProgress(false);

// Gamma LUTs (required by downsample_to_matrix.h)
uint8_t g_gammaLutR[256];
uint8_t g_gammaLutG[256];
uint8_t g_gammaLutB[256];

// testModeActive (required by effect_processor.cpp)
bool testModeActive = false;

// HAL types (CRGB, fill_solid, etc.)
#include "hal/types.h"

// HAL test headers
#include "hal/test/test_platform.h"

// HAL platform for millis/random
#include "hal/platform.h"

// Include HAL implementations
#include "hal/test/platform.cpp"

// HeadlessDisplay for test frame capture
#define HAL_TEST_DISPLAY_NO_GLOBAL
#include "hal/test/test_display.h"
#include "hal/test/display.cpp"

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

// Include effect utilities
#include "effects/effect_utils.h"
#include "effects/effect_utils.cpp"
#include "effects/gradient_utils.h"
#include "effects/gradient_utils.cpp"
#include "effects/bloom_utils.h"
#include "effects/bloom_utils.cpp"

// Include font and text rendering (required by text/scroll_text effects)
#include "fonts/den_8x8.h"
#include "fonts/den_8x8.cpp"
#include "effects/text_rendering.h"
#include "effects/text_rendering.cpp"

// Include all effect implementations
#include "effects/effect.h"
#include "effects/direction.h"
#include "effects/instance_vector.h"
#include "effects/particle_system.h"
#include "effects/particle_system.cpp"
#include "effects/pulse.h"
#include "effects/pulse.cpp"
#include "effects/bitmap.h"
#include "effects/bitmap.cpp"
#include "effects/wipe.h"
#include "effects/wipe.cpp"
#include "effects/explode.h"
#include "effects/explode.cpp"
#include "effects/test_leds.h"
#include "effects/test_leds.cpp"
#include "effects/background.h"
#include "effects/background.cpp"
#include "effects/projectile.h"
#include "effects/projectile.cpp"
#include "effects/text.h"
#include "effects/text.cpp"
#include "effects/scroll_text.h"
#include "effects/scroll_text.cpp"
#include "effects/plasma.h"
#include "effects/plasma.cpp"
#include "effects/warp.h"
#include "effects/warp.cpp"
#include "effects/spectrum.h"
#include "effects/spectrum.cpp"
#include "effects/particle_field.h"
#include "effects/particle_field.cpp"
#include "effects/sparkle.h"
#include "effects/sparkle.cpp"
#include "effects/music.h"
#include "effects/music.cpp"

// Include the EffectProcessor (this also includes downsample_to_matrix.h)
#include "effects/effect_processor.h"
#include "effects/effect_processor.cpp"

// Include test helpers
#include "helpers/effect_test_helpers.h"

using namespace test_helpers;

// =============================================================================
// Shared test fixtures
// =============================================================================

static Matrix* g_matrix = nullptr;
static hal::test::HeadlessDisplay* g_display = nullptr;
static EffectProcessor* g_processor = nullptr;

static void initTestGamma() {
	for (int i = 0; i < 256; i++) {
		g_gammaLutR[i] = i;
		g_gammaLutG[i] = i;
		g_gammaLutB[i] = i;
	}
}

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
	testModeActive = false;
	initTestGamma();

	g_matrix = new Matrix(16, 16);
	g_display = new hal::test::HeadlessDisplay();
	g_processor = new EffectProcessor(*g_matrix, *g_display);
}

void tearDown(void) {
	delete g_processor;
	delete g_display;
	delete g_matrix;
	g_processor = nullptr;
	g_display = nullptr;
	g_matrix = nullptr;
}

// =============================================================================
// Effect Routing Tests
// =============================================================================

void test_add_pulse_routes_correctly() {
	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 800;
	props["easing"] = "quinticOut";
	props["fade"] = true;
	props["collapse"] = "random";
	g_processor->addEffect("pulse", props);

	// First update initializes timing (skip frame)
	hal::test::advanceTime(16000);
	g_processor->update();

	// Second update renders the effect
	hal::test::advanceTime(16000);
	g_processor->update();

	// Display should have received a frame with non-black pixels
	const auto& frame = g_display->getLastFrame();
	TEST_ASSERT_TRUE(frame.size() > 0);

	bool hasColor = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
			hasColor = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasColor);
}

void test_add_background_routes_correctly() {
	JsonDocument props;
	JsonObject gradient = props["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#0000FF");
	gradient["orientation"] = "horizontal";
	props["fadeDuration"] = 0;
	g_processor->addEffect("background", props);

	// Init frame
	hal::test::advanceTime(16000);
	g_processor->update();

	// Render frame
	hal::test::advanceTime(16000);
	g_processor->update();

	const auto& frame = g_display->getLastFrame();
	bool hasBlue = false;
	for (const auto& pixel : frame) {
		if (pixel.b > 0) {
			hasBlue = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasBlue);
}

void test_add_particle_field_routes_correctly() {
	JsonDocument props;
	props["color"] = "#00FF00";
	props["direction"] = "down";
	props["density"] = 30;
	props["speed"] = 100;
	props["enabled"] = "on";
	g_processor->addEffect("particle_field", props);

	hal::test::advanceTime(16000);
	g_processor->update();
	hal::test::advanceTime(16000);
	g_processor->update();

	const auto& frame = g_display->getLastFrame();
	bool hasGreen = false;
	for (const auto& pixel : frame) {
		if (pixel.g > 0) {
			hasGreen = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasGreen);
}

// =============================================================================
// Unknown Effect Name
// =============================================================================

void test_unknown_effect_name_no_crash() {
	JsonDocument props;
	props["color"] = "#FFFFFF";

	// Should silently ignore unknown effect names
	g_processor->addEffect("nonexistent_effect", props);
	g_processor->addEffect("", props);
	g_processor->addEffect("PULSE", props);  // Case-sensitive

	hal::test::advanceTime(16000);
	g_processor->update();

	TEST_PASS();
}

// =============================================================================
// Reset Flag
// =============================================================================

void test_add_with_reset_flag_resets_before_add() {
	// Add a pulse first
	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["duration"] = 800;
	props1["easing"] = "quinticOut";
	props1["fade"] = true;
	props1["collapse"] = "random";
	g_processor->addEffect("pulse", props1);

	// Add again with reset=true - should reset state before adding
	JsonDocument props2;
	props2["color"] = "#00FF00";
	props2["duration"] = 800;
	props2["easing"] = "quinticOut";
	props2["fade"] = true;
	props2["collapse"] = "random";
	props2["reset"] = true;
	g_processor->addEffect("pulse", props2);

	hal::test::advanceTime(16000);
	g_processor->update();
	hal::test::advanceTime(16000);
	g_processor->update();

	// Should have green (not red) since reset cleared the first pulse
	const auto& frame = g_display->getLastFrame();
	bool hasGreen = false;
	for (const auto& pixel : frame) {
		if (pixel.g > pixel.r && pixel.g > 0) {
			hasGreen = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasGreen);
}

// =============================================================================
// clearEffects Tests
// =============================================================================

void test_clear_effects_resets_all() {
	// Add multiple effects
	JsonDocument pulseProps;
	pulseProps["color"] = "#FF0000";
	pulseProps["duration"] = 800;
	pulseProps["easing"] = "quinticOut";
	pulseProps["fade"] = true;
	pulseProps["collapse"] = "random";
	g_processor->addEffect("pulse", pulseProps);

	JsonDocument bgProps;
	JsonObject gradient = bgProps["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#0000FF");
	gradient["orientation"] = "horizontal";
	bgProps["fadeDuration"] = 0;
	g_processor->addEffect("background", bgProps);

	// Clear all
	g_processor->clearEffects();

	// After clear, display should show black
	const auto& frame = g_display->getLastFrame();
	for (const auto& pixel : frame) {
		TEST_ASSERT_EQUAL(0, pixel.r);
		TEST_ASSERT_EQUAL(0, pixel.g);
		TEST_ASSERT_EQUAL(0, pixel.b);
	}
}

void test_clear_effects_shows_on_display() {
	g_processor->clearEffects();

	// clearEffects calls display.show() directly
	TEST_ASSERT_TRUE(g_display->getFrameCount() > 0);
}

// =============================================================================
// Frame Loop Behavior
// =============================================================================

void test_first_update_skips_rendering() {
	// Add a bright background so we'd see something if rendered
	JsonDocument bgProps;
	JsonObject gradient = bgProps["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#FFFFFF");
	gradient["orientation"] = "horizontal";
	bgProps["fadeDuration"] = 0;
	g_processor->addEffect("background", bgProps);

	g_display->reset();

	// First update should only initialize timing
	hal::test::advanceTime(16000);
	g_processor->update();

	// First frame should still have been sent to display
	// But the display frame count should be 0 since first update returns early
	// (before show is called)
	TEST_ASSERT_EQUAL(0, g_display->getFrameCount());
}

void test_second_update_renders() {
	JsonDocument bgProps;
	JsonObject gradient = bgProps["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#FFFFFF");
	gradient["orientation"] = "horizontal";
	bgProps["fadeDuration"] = 0;
	g_processor->addEffect("background", bgProps);

	// First update - init
	hal::test::advanceTime(16000);
	g_processor->update();

	g_display->reset();

	// Second update - actual render
	hal::test::advanceTime(16000);
	g_processor->update();

	TEST_ASSERT_EQUAL(1, g_display->getFrameCount());
}

// =============================================================================
// Test Mode
// =============================================================================

void test_test_mode_renders_test_pattern() {
	testModeActive = true;

	// Init frame
	hal::test::advanceTime(16000);
	g_processor->update();

	// Test mode render
	hal::test::advanceTime(16000);
	g_processor->update();

	// In test mode, display should get frames (test pattern)
	TEST_ASSERT_TRUE(g_display->getFrameCount() > 0);

	// Test pattern should have some colored pixels
	const auto& frame = g_display->getLastFrame();
	bool hasColor = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
			hasColor = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasColor);
}

void test_test_mode_ignores_normal_effects() {
	// Add background that would normally render
	JsonDocument bgProps;
	JsonObject gradient = bgProps["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#0000FF");
	gradient["orientation"] = "horizontal";
	bgProps["fadeDuration"] = 0;
	g_processor->addEffect("background", bgProps);

	testModeActive = true;

	// Init + render
	hal::test::advanceTime(16000);
	g_processor->update();
	hal::test::advanceTime(16000);
	g_processor->update();

	// Should NOT have blue background (test mode takes over)
	// Test pattern uses specific color sequence, not blue
	const auto& frame = g_display->getLastFrame();
	int blueCount = 0;
	int otherCount = 0;
	for (const auto& pixel : frame) {
		if (pixel.b > 0 && pixel.r == 0 && pixel.g == 0) blueCount++;
		if (pixel.r > 0 || pixel.g > 0) otherCount++;
	}
	// Test pattern has multi-colored pixels, not pure blue
	// If normal effects ran, we'd see all blue
	TEST_ASSERT_TRUE(otherCount > 0 || blueCount < (int)frame.size());
}

// =============================================================================
// Frame Timing Metrics
// =============================================================================

void test_frame_timing_metrics_default_zero() {
	FrameTimingMetrics metrics = getFrameTimingMetrics();
	TEST_ASSERT_EQUAL(0, metrics.clearUs);
	TEST_ASSERT_EQUAL(0, metrics.effectsUs);
	TEST_ASSERT_EQUAL(0, metrics.downsampleUs);
	TEST_ASSERT_EQUAL(0, metrics.showUs);
	TEST_ASSERT_EQUAL(0, metrics.totalUs);
}

// =============================================================================
// Multiple Coexisting Effects
// =============================================================================

void test_multiple_effects_coexist() {
	// Add background
	JsonDocument bgProps;
	JsonObject gradient = bgProps["gradient"].to<JsonObject>();
	JsonArray colors = gradient["colors"].to<JsonArray>();
	colors.add("#000044");
	gradient["orientation"] = "horizontal";
	bgProps["fadeDuration"] = 0;
	g_processor->addEffect("background", bgProps);

	// Add pulse on top
	JsonDocument pulseProps;
	pulseProps["color"] = "#FF0000";
	pulseProps["duration"] = 800;
	pulseProps["easing"] = "quinticOut";
	pulseProps["fade"] = true;
	pulseProps["collapse"] = "random";
	g_processor->addEffect("pulse", pulseProps);

	// Init + render
	hal::test::advanceTime(16000);
	g_processor->update();
	hal::test::advanceTime(16000);
	g_processor->update();

	const auto& frame = g_display->getLastFrame();
	bool hasRed = false;
	bool hasBlue = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0) hasRed = true;
		if (pixel.b > 0) hasBlue = true;
	}

	// Both effects should contribute to the frame
	TEST_ASSERT_TRUE(hasRed);
	TEST_ASSERT_TRUE(hasBlue);
}

// =============================================================================
// Strip Layout
// =============================================================================

void test_works_with_strip_layout() {
	// Teardown default fixtures
	delete g_processor;
	delete g_display;
	delete g_matrix;

	g_matrix = new Matrix(60, 1);
	g_display = new hal::test::HeadlessDisplay();
	g_processor = new EffectProcessor(*g_matrix, *g_display);

	JsonDocument props;
	props["color"] = "#FFFFFF";
	props["duration"] = 800;
	props["easing"] = "quinticOut";
	props["fade"] = true;
	props["collapse"] = "random";
	g_processor->addEffect("pulse", props);

	hal::test::advanceTime(16000);
	g_processor->update();
	hal::test::advanceTime(16000);
	g_processor->update();

	const auto& frame = g_display->getLastFrame();
	bool hasColor = false;
	for (const auto& pixel : frame) {
		if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
			hasColor = true;
			break;
		}
	}
	TEST_ASSERT_TRUE(hasColor);
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Effect routing
	RUN_TEST(test_add_pulse_routes_correctly);
	RUN_TEST(test_add_background_routes_correctly);
	RUN_TEST(test_add_particle_field_routes_correctly);

	// Unknown effect
	RUN_TEST(test_unknown_effect_name_no_crash);

	// Reset flag
	RUN_TEST(test_add_with_reset_flag_resets_before_add);

	// Clear effects
	RUN_TEST(test_clear_effects_resets_all);
	RUN_TEST(test_clear_effects_shows_on_display);

	// Frame loop
	RUN_TEST(test_first_update_skips_rendering);
	RUN_TEST(test_second_update_renders);

	// Test mode
	RUN_TEST(test_test_mode_renders_test_pattern);
	RUN_TEST(test_test_mode_ignores_normal_effects);

	// Metrics
	RUN_TEST(test_frame_timing_metrics_default_zero);

	// Multiple effects
	RUN_TEST(test_multiple_effects_coexist);

	// Strip layout
	RUN_TEST(test_works_with_strip_layout);

	return UNITY_END();
}
