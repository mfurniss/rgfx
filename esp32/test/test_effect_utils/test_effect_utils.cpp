/**
 * Unit Tests for effect_utils
 *
 * Tests parseColor and randomColor functions using the real implementation.
 */

#include <unity.h>
#include <cstdint>
#include <cstdlib>

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

// Include production code
#include "effects/effect_utils.cpp"

void setUp(void) {
	hal::test::setTime(0);
	hal::test::seedRandom(12345);
}

void tearDown(void) {}

// =============================================================================
// Hex color parsing tests
// =============================================================================

void test_parseColor_with_hash_prefix() {
	uint32_t color = parseColor("#FF0000");
	TEST_ASSERT_EQUAL_UINT32(0xFF0000, color);
}

void test_parseColor_without_hash_prefix() {
	uint32_t color = parseColor("00FF00");
	TEST_ASSERT_EQUAL_UINT32(0x00FF00, color);
}

void test_parseColor_full_rgb() {
	uint32_t color = parseColor("#123456");
	TEST_ASSERT_EQUAL_UINT32(0x123456, color);
}

void test_parseColor_white_hex() {
	uint32_t color = parseColor("FFFFFF");
	TEST_ASSERT_EQUAL_UINT32(0xFFFFFF, color);
}

void test_parseColor_black_hex() {
	uint32_t color = parseColor("#000000");
	TEST_ASSERT_EQUAL_UINT32(0x000000, color);
}

void test_parseColor_uppercase() {
	uint32_t color = parseColor("#ABCDEF");
	TEST_ASSERT_EQUAL_UINT32(0xABCDEF, color);
}

void test_parseColor_lowercase() {
	uint32_t color = parseColor("abcdef");
	TEST_ASSERT_EQUAL_UINT32(0xABCDEF, color);
}

void test_parseColor_mixed_case() {
	uint32_t color = parseColor("#AbCdEf");
	TEST_ASSERT_EQUAL_UINT32(0xABCDEF, color);
}

// =============================================================================
// Named color tests (production parseColor supports color names)
// =============================================================================

void test_parseColor_named_red() {
	uint32_t color = parseColor("red");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Red, color);
}

void test_parseColor_named_RED_uppercase() {
	uint32_t color = parseColor("RED");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Red, color);
}

void test_parseColor_named_Red_mixedcase() {
	uint32_t color = parseColor("Red");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Red, color);
}

void test_parseColor_named_green() {
	uint32_t color = parseColor("green");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Green, color);
}

void test_parseColor_named_blue() {
	uint32_t color = parseColor("blue");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Blue, color);
}

void test_parseColor_named_white() {
	uint32_t color = parseColor("white");
	TEST_ASSERT_EQUAL_UINT32(CRGB::White, color);
}

void test_parseColor_named_black() {
	uint32_t color = parseColor("black");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Black, color);
}

void test_parseColor_named_yellow() {
	uint32_t color = parseColor("yellow");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Yellow, color);
}

void test_parseColor_named_cyan() {
	uint32_t color = parseColor("cyan");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Cyan, color);
}

void test_parseColor_named_magenta() {
	uint32_t color = parseColor("magenta");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Magenta, color);
}

void test_parseColor_named_orange() {
	uint32_t color = parseColor("orange");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Orange, color);
}

void test_parseColor_named_purple() {
	uint32_t color = parseColor("purple");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Purple, color);
}

void test_parseColor_named_pink() {
	uint32_t color = parseColor("pink");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Pink, color);
}

void test_parseColor_named_lime() {
	uint32_t color = parseColor("lime");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Lime, color);
}

void test_parseColor_named_navy() {
	uint32_t color = parseColor("navy");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Navy, color);
}

void test_parseColor_named_teal() {
	uint32_t color = parseColor("teal");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Teal, color);
}

void test_parseColor_named_gray() {
	uint32_t color = parseColor("gray");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Gray, color);
}

void test_parseColor_named_grey() {
	uint32_t color = parseColor("grey");
	TEST_ASSERT_EQUAL_UINT32(CRGB::Grey, color);
}

// =============================================================================
// Random color tests
// =============================================================================

void test_parseColor_random_returns_valid_color() {
	uint32_t color = parseColor("random");
	// Should return a valid RGB color (max 0xFFFFFF)
	TEST_ASSERT_TRUE(color <= 0xFFFFFF);
}

void test_parseColor_random_is_deterministic_with_seed() {
	// Seed the random generator
	hal::test::seedRandom(42);
	uint32_t color1 = parseColor("random");

	// Re-seed with same value
	hal::test::seedRandom(42);
	uint32_t color2 = parseColor("random");

	TEST_ASSERT_EQUAL_UINT32(color1, color2);
}

void test_parseColor_random_varies_with_different_seeds() {
	hal::test::seedRandom(100);
	uint32_t color1 = parseColor("random");

	hal::test::seedRandom(200);
	uint32_t color2 = parseColor("random");

	// With different seeds, colors should differ (probabilistically)
	TEST_ASSERT_NOT_EQUAL(color1, color2);
}

// =============================================================================
// randomColor() function tests
// =============================================================================

void test_randomColor_returns_valid_color() {
	uint32_t color = randomColor();
	// Should return a valid RGB color
	TEST_ASSERT_TRUE(color <= 0xFFFFFF);
}

void test_randomColor_varies() {
	hal::test::seedRandom(12345);
	uint32_t color1 = randomColor();
	uint32_t color2 = randomColor();

	// Consecutive calls should produce different colors
	TEST_ASSERT_NOT_EQUAL(color1, color2);
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Hex color parsing
	RUN_TEST(test_parseColor_with_hash_prefix);
	RUN_TEST(test_parseColor_without_hash_prefix);
	RUN_TEST(test_parseColor_full_rgb);
	RUN_TEST(test_parseColor_white_hex);
	RUN_TEST(test_parseColor_black_hex);
	RUN_TEST(test_parseColor_uppercase);
	RUN_TEST(test_parseColor_lowercase);
	RUN_TEST(test_parseColor_mixed_case);

	// Named colors
	RUN_TEST(test_parseColor_named_red);
	RUN_TEST(test_parseColor_named_RED_uppercase);
	RUN_TEST(test_parseColor_named_Red_mixedcase);
	RUN_TEST(test_parseColor_named_green);
	RUN_TEST(test_parseColor_named_blue);
	RUN_TEST(test_parseColor_named_white);
	RUN_TEST(test_parseColor_named_black);
	RUN_TEST(test_parseColor_named_yellow);
	RUN_TEST(test_parseColor_named_cyan);
	RUN_TEST(test_parseColor_named_magenta);
	RUN_TEST(test_parseColor_named_orange);
	RUN_TEST(test_parseColor_named_purple);
	RUN_TEST(test_parseColor_named_pink);
	RUN_TEST(test_parseColor_named_lime);
	RUN_TEST(test_parseColor_named_navy);
	RUN_TEST(test_parseColor_named_teal);
	RUN_TEST(test_parseColor_named_gray);
	RUN_TEST(test_parseColor_named_grey);

	// Random colors
	RUN_TEST(test_parseColor_random_returns_valid_color);
	RUN_TEST(test_parseColor_random_is_deterministic_with_seed);
	RUN_TEST(test_parseColor_random_varies_with_different_seeds);
	RUN_TEST(test_randomColor_returns_valid_color);
	RUN_TEST(test_randomColor_varies);

	return UNITY_END();
}
