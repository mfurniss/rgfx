#include <unity.h>
#include <cstdint>
#include <cstdlib>

uint32_t parseColor(const char* colorHex) {
	if (colorHex[0] == '#') {
		colorHex++;
	}
	return (uint32_t)strtol(colorHex, NULL, 16);
}

void setUp(void) {}

void tearDown(void) {}

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

void test_parseColor_white() {
	uint32_t color = parseColor("FFFFFF");
	TEST_ASSERT_EQUAL_UINT32(0xFFFFFF, color);
}

void test_parseColor_black() {
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

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_parseColor_with_hash_prefix);
	RUN_TEST(test_parseColor_without_hash_prefix);
	RUN_TEST(test_parseColor_full_rgb);
	RUN_TEST(test_parseColor_white);
	RUN_TEST(test_parseColor_black);
	RUN_TEST(test_parseColor_uppercase);
	RUN_TEST(test_parseColor_lowercase);
	RUN_TEST(test_parseColor_mixed_case);
	return UNITY_END();
}
