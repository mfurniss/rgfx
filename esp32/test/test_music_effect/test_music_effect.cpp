/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit Tests for MusicEffect
 *
 * Tests the music channel visualizer effect using the real implementation.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
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

// Include utils
#include "effects/effect_utils.h"
#include "effects/effect_utils.cpp"

// Include effects
#include "effects/effect.h"
#include "effects/music.h"
#include "effects/music.cpp"

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
// hexToPitch Tests
// =============================================================================

void test_hexToPitch_silent() {
	TEST_ASSERT_EQUAL(-1, MusicEffect::hexToPitch(".."));
}

void test_hexToPitch_zero() {
	TEST_ASSERT_EQUAL(0, MusicEffect::hexToPitch("00"));
}

void test_hexToPitch_values() {
	TEST_ASSERT_EQUAL(10, MusicEffect::hexToPitch("0A"));
	TEST_ASSERT_EQUAL(128, MusicEffect::hexToPitch("80"));
	TEST_ASSERT_EQUAL(255, MusicEffect::hexToPitch("FF"));
}

void test_hexToPitch_lowercase() {
	TEST_ASSERT_EQUAL(255, MusicEffect::hexToPitch("ff"));
	TEST_ASSERT_EQUAL(171, MusicEffect::hexToPitch("aB"));
}

void test_hexToPitch_invalid() {
	TEST_ASSERT_EQUAL(-1, MusicEffect::hexToPitch("GG"));
	TEST_ASSERT_EQUAL(-1, MusicEffect::hexToPitch("  "));
}

// =============================================================================
// pitchToX Tests
// =============================================================================

void test_pitchToX_negative_pitch_returns_zero() {
	TEST_ASSERT_EQUAL(0, MusicEffect::pitchToX(-1, 0, 255, 64));
}

void test_pitchToX_min_at_left_edge() {
	uint16_t x = MusicEffect::pitchToX(5, 5, 200, 96);
	TEST_ASSERT_EQUAL(0, x);
}

void test_pitchToX_max_at_right_edge() {
	uint16_t x = MusicEffect::pitchToX(200, 5, 200, 96);
	TEST_ASSERT_TRUE(x >= 80);
	TEST_ASSERT_EQUAL(0, x % 8);
}

void test_pitchToX_mid_range() {
	uint16_t x = MusicEffect::pitchToX(100, 0, 200, 96);
	TEST_ASSERT_TRUE(x > 16);
	TEST_ASSERT_TRUE(x < 72);
	TEST_ASSERT_EQUAL(0, x % 8);
}

void test_pitchToX_single_pitch_centers() {
	uint16_t x = MusicEffect::pitchToX(100, 100, 100, 96);
	uint16_t center = 96 / 2;
	TEST_ASSERT_TRUE(x >= center - 8);
	TEST_ASSERT_TRUE(x <= center + 8);
	TEST_ASSERT_EQUAL(0, x % 8);
}

void test_pitchToX_always_snapped_to_8() {
	for (int pitch = 0; pitch <= 255; pitch++) {
		uint16_t x = MusicEffect::pitchToX(pitch, 0, 255, 96);
		TEST_ASSERT_EQUAL_MESSAGE(0, x % 8, "X not snapped to 2-LED boundary");
	}
}

void test_pitchToX_monotonically_increasing() {
	uint16_t prevX = 0;
	for (int pitch = 0; pitch <= 255; pitch++) {
		uint16_t x = MusicEffect::pitchToX(pitch, 0, 255, 96);
		TEST_ASSERT_TRUE(x >= prevX);
		prevX = x;
	}
}

// =============================================================================
// Basic Rendering Tests
// =============================================================================

void test_music_renders_notes() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "..|80|90|A0|..|70|50|60";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

void test_music_silent_channels_produce_no_notes() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "..|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_music_no_render_without_channels() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	// No channels property
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Matrix-Only Constraint
// =============================================================================

void test_music_ignored_on_strip() {
	Matrix matrix(16, 1, "strip");
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "60|FF|68|70|60|78|80|88";
	effect.add(props);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// Note Positioning Tests
// =============================================================================

void test_music_notes_anchored_to_bottom() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	int bottomY = findBottommostPixelY(canvas);
	TEST_ASSERT_EQUAL(canvas.getHeight() - 1, bottomY);
}

void test_music_different_pitches_different_x() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// Channel 0 = low pitch, channel 1 = high pitch
	JsonDocument props;
	props["channels"] = "0A|FF|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	uint16_t width = box.maxX - box.minX + 1;
	TEST_ASSERT_TRUE(width > canvas.getWidth() / 2);
}

// =============================================================================
// Auto-Scaling Tests
// =============================================================================

void test_music_auto_scale_expands_range() {
	Matrix matrix(24, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// First event: single pitch -> centered, narrow bounding box
	JsonDocument props1;
	props1["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props1);

	canvas.clear();
	effect.render();
	BoundingBox box1 = findBoundingBox(canvas);
	uint16_t spread1 = box1.maxX - box1.minX;

	// Second event: add a very different pitch -> range established, notes spread
	JsonDocument props2;
	props2["channels"] = "0A|..|..|..|..|..|..|..";
	effect.add(props2);

	canvas.clear();
	effect.render();
	BoundingBox box2 = findBoundingBox(canvas);
	uint16_t spread2 = box2.maxX - box2.minX;

	TEST_ASSERT_TRUE(spread2 > spread1);
}

void test_music_auto_scale_full_width_with_range() {
	Matrix matrix(24, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// Add notes at extremes to establish full range
	JsonDocument props;
	props["channels"] = "0A|FF|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_EQUAL(0, box.minX);
	// Max pitch bar lands one bar-width from right edge (padding slot at right)
	TEST_ASSERT_TRUE(box.maxX >= canvas.getWidth() - 16);
}

void test_music_reset_clears_pitch_range() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// Establish a wide range
	JsonDocument props1;
	props1["channels"] = "0A|FF|..|..|..|..|..|..";
	effect.add(props1);
	effect.reset();

	// After reset, a single pitch should render at center (no range)
	JsonDocument props2;
	props2["channels"] = "68|..|..|..|..|..|..|..";
	effect.add(props2);

	canvas.clear();
	effect.render();
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);

	uint16_t noteCenter = (box.minX + box.maxX) / 2;
	uint16_t canvasCenter = canvas.getWidth() / 2;
	TEST_ASSERT_TRUE(noteCenter >= canvasCenter - 8);
	TEST_ASSERT_TRUE(noteCenter <= canvasCenter + 8);
}

// =============================================================================
// Decay Tests
// =============================================================================

void test_music_decays_over_time() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
	effect.add(props);

	canvas.clear();
	effect.render();
	int pixelsBefore = countNonBlackPixels(canvas);

	effect.update(0.3f);

	canvas.clear();
	effect.render();
	int pixelsAfter = countNonBlackPixels(canvas);

	TEST_ASSERT_TRUE(pixelsAfter < pixelsBefore);
}

void test_music_fully_decays() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
	effect.add(props);

	effect.update(0.6f);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_music_custom_decay_rate() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
	props["decayRate"] = 10.0f;
	effect.add(props);

	effect.update(0.15f);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

// =============================================================================
// FIFO Buffer Tests
// =============================================================================

void test_music_fifo_accumulates_notes() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// First batch: one note at low pitch
	JsonDocument props1;
	props1["channels"] = "0A|..|..|..|..|..|..|..";
	effect.add(props1);

	canvas.clear();
	effect.render();
	int pixels1 = countNonBlackPixels(canvas);

	// Second batch: one note at high pitch on different channel
	JsonDocument props2;
	props2["channels"] = "..|FF|..|..|..|..|..|..";
	effect.add(props2);

	canvas.clear();
	effect.render();
	int pixels2 = countNonBlackPixels(canvas);

	TEST_ASSERT_TRUE(pixels2 > pixels1);
}

void test_music_fifo_wraps_around() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// Push more than BUFFER_SIZE notes (128 buffer, 8 notes per add = 16 adds)
	for (int i = 0; i < 20; i++) {
		JsonDocument props;
		props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
		effect.add(props);
	}

	canvas.clear();
	effect.render();
	TEST_ASSERT_TRUE(countNonBlackPixels(canvas) > 0);
}

// =============================================================================
// Color Tests
// =============================================================================

void test_music_different_channels_have_different_colors() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// Add single note from channel 0
	JsonDocument props1;
	props1["channels"] = "FF|..|..|..|..|..|..|..";
	effect.add(props1);

	canvas.clear();
	effect.render();

	BoundingBox box1 = findBoundingBox(canvas);
	CRGB color1 = canvas.getPixel(box1.minX, box1.minY);

	// Reset and add from channel 4 (different hue)
	effect.reset();
	JsonDocument props2;
	props2["channels"] = "..|..|..|..|FF|..|..|..";
	effect.add(props2);

	canvas.clear();
	effect.render();

	BoundingBox box2 = findBoundingBox(canvas);
	CRGB color2 = canvas.getPixel(box2.minX, box2.minY);

	TEST_ASSERT_TRUE(color1 != color2);
}

void test_music_has_colored_pixels() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
	effect.add(props);

	canvas.clear();
	effect.render();

	bool hasRed = false;
	bool hasGreen = false;
	bool hasBlue = false;

	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB pixel = canvas.getPixel(x, y);
			if (pixel.r > 50) hasRed = true;
			if (pixel.g > 50) hasGreen = true;
			if (pixel.b > 50) hasBlue = true;
		}
	}

	TEST_ASSERT_TRUE(hasRed);
	TEST_ASSERT_TRUE(hasGreen);
	TEST_ASSERT_TRUE(hasBlue);
}

// =============================================================================
// Reset Tests
// =============================================================================

void test_music_reset_clears_notes() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|FF|FF|FF|FF|FF|FF|FF";
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
// Note Width Tests
// =============================================================================

void test_music_note_is_two_leds_wide() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	uint16_t width = box.maxX - box.minX + 1;
	TEST_ASSERT_EQUAL(8, width);
}

// =============================================================================
// Full Height Test
// =============================================================================

void test_music_new_note_full_height() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "FF|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	TEST_ASSERT_EQUAL(0, box.minY);
	TEST_ASSERT_EQUAL(canvas.getHeight() - 1, box.maxY);
}

// =============================================================================
// Peak Indicator Tests
// =============================================================================

void test_music_peak_appears_at_note_top() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();

	// New note has life=1.0, so bar fills full height.
	// Peak should be at y=0 (top). Check for blue component there.
	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	CRGB topPixel = canvas.getPixel(box.minX, 0);
	TEST_ASSERT_TRUE(topPixel.b > 0);
}

void test_music_peak_holds_then_falls() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();  // Sets peak to 1.0

	// Decay the note completely (default decayRate=2.0, 1.0s to fully decay)
	effect.update(1.0f);

	// Peak should still be holding (holdTimer was 0.5s, only 0.5s of hold elapsed
	// after subtracting deltaTime). Actually 1.0s > 0.5s hold, so it should be falling.
	// After 1.0s: holdTimer = 0.5 - 1.0 = expired, then falls by PEAK_FALL_RATE*0.5s = 0.5
	// Peak height should be ~0.5
	canvas.clear();
	effect.render();

	BoundingBox box = findBoundingBox(canvas);
	TEST_ASSERT_TRUE(box.valid);
	// Peak still visible (height ~0.5, not zero yet)
	TEST_ASSERT_TRUE(box.minY > 0);  // Not at top anymore
	TEST_ASSERT_TRUE(box.minY < canvas.getHeight() - 1);  // Not at bottom yet
}

void test_music_peak_updates_to_higher_bar() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	// First note: partial life (decay first)
	JsonDocument props1;
	props1["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props1);
	effect.update(0.25f);  // life drops to 0.5

	canvas.clear();
	effect.render();
	BoundingBox box1 = findBoundingBox(canvas);

	// Second note at same pitch: full life (higher bar)
	JsonDocument props2;
	props2["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props2);

	canvas.clear();
	effect.render();
	BoundingBox box2 = findBoundingBox(canvas);

	// Peak should have moved up (lower Y value)
	TEST_ASSERT_TRUE(box2.minY <= box1.minY);
}

void test_music_peak_clears_on_reset() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();  // Sets peak

	effect.reset();

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

void test_music_peak_disappears_after_full_decay() {
	Matrix matrix(16, 16);
	Canvas canvas(matrix);
	MusicEffect effect(matrix, canvas);

	JsonDocument props;
	props["channels"] = "80|..|..|..|..|..|..|..";
	effect.add(props);

	canvas.clear();
	effect.render();  // Sets peak to 1.0

	// Hold (0.5s) + full fall (1.0s at rate 1.0) = 1.5s total
	effect.update(2.0f);

	canvas.clear();
	effect.render();

	TEST_ASSERT_EQUAL(0, countNonBlackPixels(canvas));
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// hexToPitch
	RUN_TEST(test_hexToPitch_silent);
	RUN_TEST(test_hexToPitch_zero);
	RUN_TEST(test_hexToPitch_values);
	RUN_TEST(test_hexToPitch_lowercase);
	RUN_TEST(test_hexToPitch_invalid);

	// pitchToX
	RUN_TEST(test_pitchToX_negative_pitch_returns_zero);
	RUN_TEST(test_pitchToX_min_at_left_edge);
	RUN_TEST(test_pitchToX_max_at_right_edge);
	RUN_TEST(test_pitchToX_mid_range);
	RUN_TEST(test_pitchToX_single_pitch_centers);
	RUN_TEST(test_pitchToX_always_snapped_to_8);
	RUN_TEST(test_pitchToX_monotonically_increasing);

	// Basic rendering
	RUN_TEST(test_music_renders_notes);
	RUN_TEST(test_music_silent_channels_produce_no_notes);
	RUN_TEST(test_music_no_render_without_channels);

	// Matrix-only
	RUN_TEST(test_music_ignored_on_strip);

	// Positioning
	RUN_TEST(test_music_notes_anchored_to_bottom);
	RUN_TEST(test_music_different_pitches_different_x);

	// Auto-scaling
	RUN_TEST(test_music_auto_scale_expands_range);
	RUN_TEST(test_music_auto_scale_full_width_with_range);
	RUN_TEST(test_music_reset_clears_pitch_range);

	// Decay
	RUN_TEST(test_music_decays_over_time);
	RUN_TEST(test_music_fully_decays);
	RUN_TEST(test_music_custom_decay_rate);

	// FIFO
	RUN_TEST(test_music_fifo_accumulates_notes);
	RUN_TEST(test_music_fifo_wraps_around);

	// Colors
	RUN_TEST(test_music_different_channels_have_different_colors);
	RUN_TEST(test_music_has_colored_pixels);

	// Reset
	RUN_TEST(test_music_reset_clears_notes);

	// Dimensions
	RUN_TEST(test_music_note_is_two_leds_wide);
	RUN_TEST(test_music_new_note_full_height);

	// Peak indicators
	RUN_TEST(test_music_peak_appears_at_note_top);
	RUN_TEST(test_music_peak_holds_then_falls);
	RUN_TEST(test_music_peak_updates_to_higher_bar);
	RUN_TEST(test_music_peak_clears_on_reset);
	RUN_TEST(test_music_peak_disappears_after_full_decay);

	return UNITY_END();
}
