/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for config_leds.cpp helper functions
 *
 * Tests the pure helper functions extracted from config_leds.cpp:
 * - getColorOrder(): string → EOrder enum
 * - isRGBWColorOrder(): detect 4-channel color orders
 * - getWhitePosition(): find W position in color order string
 * - getColorCorrection(): string → correction constant
 * - getRGBWMode(): string → RGBW mode enum
 */

#include <unity.h>
#include <string>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Stubs
enum class LogLevel { INFO, ERROR };
void log(const char*, LogLevel = LogLevel::INFO) {}
void log(const String&, LogLevel = LogLevel::INFO) {}

// Mock FastLED EOrder enum (mirrors FastLED pixel types)
enum EOrder {
	RGB = 0012,
	RBG = 0021,
	GRB = 0102,
	GBR = 0120,
	BRG = 0201,
	BGR = 0210
};

// Mock FastLED color correction constants
static const uint32_t TypicalLEDStrip = 0xFFB0F0;
static const uint32_t Typical8mmPixel = 0xFFE08C;
static const uint32_t UncorrectedColor = 0xFFFFFF;

// Mock FastLED RGBW types
namespace fl {
enum EOrderW { W0 = 0, W1 = 1, W2 = 2, W3 = 3 };
enum RGBW_MODE { kRGBWExactColors = 0, kRGBWMaxBrightness = 1 };
}  // namespace fl

// --- Extracted: config_leds helper functions (mirrors config_leds.cpp) ---

static uint32_t getColorCorrection(const String& correction) {
	if (correction == "Typical8mmPixel") {
		return Typical8mmPixel;
	} else if (correction == "UncorrectedColor") {
		return UncorrectedColor;
	}
	return TypicalLEDStrip;
}

static bool isRGBWColorOrder(const String& colorOrder) {
	return colorOrder.length() == 4 && colorOrder.find('W') != String::npos;
}

static fl::EOrderW getWhitePosition(const String& colorOrder) {
	auto pos = colorOrder.find('W');
	if (pos == String::npos) return fl::W3;
	switch (pos) {
		case 0: return fl::W0;
		case 1: return fl::W1;
		case 2: return fl::W2;
		case 3: return fl::W3;
		default: return fl::W3;
	}
}

static EOrder getColorOrder(const String& colorOrder) {
	// Build RGB-only string by removing W
	String rgbPart = "";
	for (size_t i = 0; i < colorOrder.length() && rgbPart.length() < 3; i++) {
		char c = colorOrder[i];
		if (c != 'W' && c != 'w') {
			rgbPart += c;
		}
	}

	if (rgbPart == "RGB") return RGB;
	if (rgbPart == "RBG") return RBG;
	if (rgbPart == "GRB") return GRB;
	if (rgbPart == "GBR") return GBR;
	if (rgbPart == "BRG") return BRG;
	if (rgbPart == "BGR") return BGR;

	return GRB;  // Default
}

static fl::RGBW_MODE getRGBWMode(const String& mode) {
	if (mode == "max_brightness") return fl::kRGBWMaxBrightness;
	return fl::kRGBWExactColors;
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {}
void tearDown(void) {}

// =============================================================================
// getColorOrder Tests
// =============================================================================

void test_color_order_rgb() {
	TEST_ASSERT_EQUAL(RGB, getColorOrder("RGB"));
}

void test_color_order_rbg() {
	TEST_ASSERT_EQUAL(RBG, getColorOrder("RBG"));
}

void test_color_order_grb() {
	TEST_ASSERT_EQUAL(GRB, getColorOrder("GRB"));
}

void test_color_order_gbr() {
	TEST_ASSERT_EQUAL(GBR, getColorOrder("GBR"));
}

void test_color_order_brg() {
	TEST_ASSERT_EQUAL(BRG, getColorOrder("BRG"));
}

void test_color_order_bgr() {
	TEST_ASSERT_EQUAL(BGR, getColorOrder("BGR"));
}

void test_color_order_unknown_defaults_grb() {
	TEST_ASSERT_EQUAL(GRB, getColorOrder("XYZ"));
}

void test_color_order_empty_defaults_grb() {
	TEST_ASSERT_EQUAL(GRB, getColorOrder(""));
}

void test_color_order_rgbw_extracts_rgb() {
	TEST_ASSERT_EQUAL(RGB, getColorOrder("RGBW"));
}

void test_color_order_grbw_extracts_grb() {
	TEST_ASSERT_EQUAL(GRB, getColorOrder("GRBW"));
}

void test_color_order_wrgb_extracts_rgb() {
	TEST_ASSERT_EQUAL(RGB, getColorOrder("WRGB"));
}

void test_color_order_rgwb_extracts_rgb() {
	TEST_ASSERT_EQUAL(RGB, getColorOrder("RGWB"));
}

// =============================================================================
// isRGBWColorOrder Tests
// =============================================================================

void test_rgbw_detected() {
	TEST_ASSERT_TRUE(isRGBWColorOrder("RGBW"));
}

void test_grbw_detected() {
	TEST_ASSERT_TRUE(isRGBWColorOrder("GRBW"));
}

void test_wrgb_detected() {
	TEST_ASSERT_TRUE(isRGBWColorOrder("WRGB"));
}

void test_rgb_not_rgbw() {
	TEST_ASSERT_FALSE(isRGBWColorOrder("RGB"));
}

void test_grb_not_rgbw() {
	TEST_ASSERT_FALSE(isRGBWColorOrder("GRB"));
}

void test_empty_not_rgbw() {
	TEST_ASSERT_FALSE(isRGBWColorOrder(""));
}

void test_five_char_not_rgbw() {
	TEST_ASSERT_FALSE(isRGBWColorOrder("RGBWX"));
}

void test_four_char_no_w_not_rgbw() {
	TEST_ASSERT_FALSE(isRGBWColorOrder("RGBX"));
}

// =============================================================================
// getWhitePosition Tests
// =============================================================================

void test_white_at_position_0() {
	TEST_ASSERT_EQUAL(fl::W0, getWhitePosition("WRGB"));
}

void test_white_at_position_1() {
	TEST_ASSERT_EQUAL(fl::W1, getWhitePosition("RWGB"));
}

void test_white_at_position_2() {
	TEST_ASSERT_EQUAL(fl::W2, getWhitePosition("RGWB"));
}

void test_white_at_position_3() {
	TEST_ASSERT_EQUAL(fl::W3, getWhitePosition("RGBW"));
}

void test_no_white_defaults_w3() {
	TEST_ASSERT_EQUAL(fl::W3, getWhitePosition("RGB"));
}

// =============================================================================
// getColorCorrection Tests
// =============================================================================

void test_correction_typical_led_strip() {
	TEST_ASSERT_EQUAL(TypicalLEDStrip, getColorCorrection("TypicalLEDStrip"));
}

void test_correction_typical_8mm_pixel() {
	TEST_ASSERT_EQUAL(Typical8mmPixel, getColorCorrection("Typical8mmPixel"));
}

void test_correction_uncorrected() {
	TEST_ASSERT_EQUAL(UncorrectedColor, getColorCorrection("UncorrectedColor"));
}

void test_correction_unknown_defaults_led_strip() {
	TEST_ASSERT_EQUAL(TypicalLEDStrip, getColorCorrection("SomethingElse"));
}

void test_correction_empty_defaults_led_strip() {
	TEST_ASSERT_EQUAL(TypicalLEDStrip, getColorCorrection(""));
}

// =============================================================================
// getRGBWMode Tests
// =============================================================================

void test_rgbw_mode_exact() {
	TEST_ASSERT_EQUAL(fl::kRGBWExactColors, getRGBWMode("exact"));
}

void test_rgbw_mode_max_brightness() {
	TEST_ASSERT_EQUAL(fl::kRGBWMaxBrightness, getRGBWMode("max_brightness"));
}

void test_rgbw_mode_unknown_defaults_exact() {
	TEST_ASSERT_EQUAL(fl::kRGBWExactColors, getRGBWMode("something"));
}

void test_rgbw_mode_empty_defaults_exact() {
	TEST_ASSERT_EQUAL(fl::kRGBWExactColors, getRGBWMode(""));
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Color order parsing
	RUN_TEST(test_color_order_rgb);
	RUN_TEST(test_color_order_rbg);
	RUN_TEST(test_color_order_grb);
	RUN_TEST(test_color_order_gbr);
	RUN_TEST(test_color_order_brg);
	RUN_TEST(test_color_order_bgr);
	RUN_TEST(test_color_order_unknown_defaults_grb);
	RUN_TEST(test_color_order_empty_defaults_grb);
	RUN_TEST(test_color_order_rgbw_extracts_rgb);
	RUN_TEST(test_color_order_grbw_extracts_grb);
	RUN_TEST(test_color_order_wrgb_extracts_rgb);
	RUN_TEST(test_color_order_rgwb_extracts_rgb);

	// RGBW detection
	RUN_TEST(test_rgbw_detected);
	RUN_TEST(test_grbw_detected);
	RUN_TEST(test_wrgb_detected);
	RUN_TEST(test_rgb_not_rgbw);
	RUN_TEST(test_grb_not_rgbw);
	RUN_TEST(test_empty_not_rgbw);
	RUN_TEST(test_five_char_not_rgbw);
	RUN_TEST(test_four_char_no_w_not_rgbw);

	// White position
	RUN_TEST(test_white_at_position_0);
	RUN_TEST(test_white_at_position_1);
	RUN_TEST(test_white_at_position_2);
	RUN_TEST(test_white_at_position_3);
	RUN_TEST(test_no_white_defaults_w3);

	// Color correction
	RUN_TEST(test_correction_typical_led_strip);
	RUN_TEST(test_correction_typical_8mm_pixel);
	RUN_TEST(test_correction_uncorrected);
	RUN_TEST(test_correction_unknown_defaults_led_strip);
	RUN_TEST(test_correction_empty_defaults_led_strip);

	// RGBW mode
	RUN_TEST(test_rgbw_mode_exact);
	RUN_TEST(test_rgbw_mode_max_brightness);
	RUN_TEST(test_rgbw_mode_unknown_defaults_exact);
	RUN_TEST(test_rgbw_mode_empty_defaults_exact);

	return UNITY_END();
}

#endif  // UNIT_TEST
