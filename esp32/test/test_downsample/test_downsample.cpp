#include <unity.h>
#include "canvas.h"
#include "canvas.cpp"
#include "downsample.h"
#include "downsample.cpp"

void setUp(void) {}

void tearDown(void) {}

void test_downsample_16x16_to_4x4_uniform_color() {
	Canvas source(16, 16);
	Canvas dest(4, 4);

	source.fill(RGBA(255, 128, 64, 255));
	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 128, 64, 255), dest.getPixel(0, 0));
	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 128, 64, 255), dest.getPixel(3, 3));
	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 128, 64, 255), dest.getPixel(1, 2));
}

void test_downsample_8x8_to_2x2_quadrants() {
	Canvas source(8, 8);
	Canvas dest(2, 2);

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			source.setPixel(x, y, RGBA(255, 0, 0, 255));
			source.setPixel(x + 4, y, RGBA(0, 255, 0, 255));
			source.setPixel(x, y + 4, RGBA(0, 0, 255, 255));
			source.setPixel(x + 4, y + 4, RGBA(255, 255, 0, 255));
		}
	}

	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 0, 0, 255), dest.getPixel(0, 0));
	TEST_ASSERT_EQUAL_UINT32(RGBA(0, 255, 0, 255), dest.getPixel(1, 0));
	TEST_ASSERT_EQUAL_UINT32(RGBA(0, 0, 255, 255), dest.getPixel(0, 1));
	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 255, 0, 255), dest.getPixel(1, 1));
}

void test_downsample_color_averaging() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.setPixel(0, 0, RGBA(255, 0, 0, 255));
	source.setPixel(1, 0, RGBA(0, 255, 0, 255));
	source.setPixel(2, 0, RGBA(0, 0, 255, 255));
	source.setPixel(3, 0, RGBA(255, 255, 255, 255));

	source.setPixel(0, 1, RGBA(128, 0, 0, 255));
	source.setPixel(1, 1, RGBA(0, 128, 0, 255));
	source.setPixel(2, 1, RGBA(0, 0, 128, 255));
	source.setPixel(3, 1, RGBA(128, 128, 128, 255));

	source.setPixel(0, 2, RGBA(64, 0, 0, 255));
	source.setPixel(1, 2, RGBA(0, 64, 0, 255));
	source.setPixel(2, 2, RGBA(0, 0, 64, 255));
	source.setPixel(3, 2, RGBA(64, 64, 64, 255));

	source.setPixel(0, 3, RGBA(32, 0, 0, 255));
	source.setPixel(1, 3, RGBA(0, 32, 0, 255));
	source.setPixel(2, 3, RGBA(0, 0, 32, 255));
	source.setPixel(3, 3, RGBA(32, 32, 32, 255));

	downsample(&source, &dest);

	uint32_t result = dest.getPixel(0, 0);
	uint32_t expectedR = (255 + 0 + 0 + 255 + 128 + 0 + 0 + 128 + 64 + 0 + 0 + 64 + 32 + 0 + 0 + 32) / 16;
	uint32_t expectedG = (0 + 255 + 0 + 255 + 0 + 128 + 0 + 128 + 0 + 64 + 0 + 64 + 0 + 32 + 0 + 32) / 16;
	uint32_t expectedB = (0 + 0 + 255 + 255 + 0 + 0 + 128 + 128 + 0 + 0 + 64 + 64 + 0 + 0 + 32 + 32) / 16;

	TEST_ASSERT_EQUAL_UINT8(expectedR, RGBA_RED(result));
	TEST_ASSERT_EQUAL_UINT8(expectedG, RGBA_GREEN(result));
	TEST_ASSERT_EQUAL_UINT8(expectedB, RGBA_BLUE(result));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_ALPHA(result));
}

void test_downsample_black() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.fill(RGBA(0, 0, 0, 255));
	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(0, 0, 0, 255), dest.getPixel(0, 0));
}

void test_downsample_white() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.fill(RGBA(255, 255, 255, 255));
	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 255, 255, 255), dest.getPixel(0, 0));
}

void test_downsample_transparent_black() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.fill(RGBA(0, 0, 0, 0));
	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(0, 0, 0, 0), dest.getPixel(0, 0));
}

void test_downsample_alpha_averaging() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.setPixel(0, 0, RGBA(255, 0, 0, 255));
	source.setPixel(1, 0, RGBA(255, 0, 0, 192));
	source.setPixel(2, 0, RGBA(255, 0, 0, 128));
	source.setPixel(3, 0, RGBA(255, 0, 0, 64));

	for (uint16_t y = 1; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			source.setPixel(x, y, RGBA(255, 0, 0, 128));
		}
	}

	downsample(&source, &dest);

	uint32_t result = dest.getPixel(0, 0);
	uint32_t expectedAlpha = (255 + 192 + 128 + 64 + 128 * 12) / 16;

	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(result));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_GREEN(result));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(result));
	TEST_ASSERT_EQUAL_UINT8(expectedAlpha, RGBA_ALPHA(result));
}

void test_downsample_32x32_to_8x8() {
	Canvas source(32, 32);
	Canvas dest(8, 8);

	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			uint8_t value = (x + y) % 256;
			source.setPixel(x, y, RGBA(value, value, value, 255));
		}
	}

	downsample(&source, &dest);

	TEST_ASSERT_EQUAL(8, dest.getWidth());
	TEST_ASSERT_EQUAL(8, dest.getHeight());
}

void test_downsample_clears_destination() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	dest.fill(RGBA(123, 45, 67, 89));

	source.fill(RGBA(255, 128, 64, 255));
	downsample(&source, &dest);

	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 128, 64, 255), dest.getPixel(0, 0));
}

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_downsample_16x16_to_4x4_uniform_color);
	RUN_TEST(test_downsample_8x8_to_2x2_quadrants);
	RUN_TEST(test_downsample_color_averaging);
	RUN_TEST(test_downsample_black);
	RUN_TEST(test_downsample_white);
	RUN_TEST(test_downsample_transparent_black);
	RUN_TEST(test_downsample_alpha_averaging);
	RUN_TEST(test_downsample_32x32_to_8x8);
	RUN_TEST(test_downsample_clears_destination);
	return UNITY_END();
}
