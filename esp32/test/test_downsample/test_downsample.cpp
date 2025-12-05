/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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

	source.fill(CRGB(255, 128, 64));
	downsample(&source, &dest);

	CRGB result = dest.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(128, result.g);
	TEST_ASSERT_EQUAL_UINT8(64, result.b);

	result = dest.getPixel(3, 3);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(128, result.g);
	TEST_ASSERT_EQUAL_UINT8(64, result.b);
}

void test_downsample_8x8_to_2x2_quadrants() {
	Canvas source(8, 8);
	Canvas dest(2, 2);

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			source.drawPixel(x, y, CRGB(255, 0, 0));
			source.drawPixel(x + 4, y, CRGB(0, 255, 0));
			source.drawPixel(x, y + 4, CRGB(0, 0, 255));
			source.drawPixel(x + 4, y + 4, CRGB(255, 255, 0));
		}
	}

	downsample(&source, &dest);

	CRGB tl = dest.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, tl.r);
	TEST_ASSERT_EQUAL_UINT8(0, tl.g);
	TEST_ASSERT_EQUAL_UINT8(0, tl.b);

	CRGB tr = dest.getPixel(1, 0);
	TEST_ASSERT_EQUAL_UINT8(0, tr.r);
	TEST_ASSERT_EQUAL_UINT8(255, tr.g);
	TEST_ASSERT_EQUAL_UINT8(0, tr.b);

	CRGB bl = dest.getPixel(0, 1);
	TEST_ASSERT_EQUAL_UINT8(0, bl.r);
	TEST_ASSERT_EQUAL_UINT8(0, bl.g);
	TEST_ASSERT_EQUAL_UINT8(255, bl.b);

	CRGB br = dest.getPixel(1, 1);
	TEST_ASSERT_EQUAL_UINT8(255, br.r);
	TEST_ASSERT_EQUAL_UINT8(255, br.g);
	TEST_ASSERT_EQUAL_UINT8(0, br.b);
}

void test_downsample_color_averaging() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.drawPixel(0, 0, CRGB(255, 0, 0));
	source.drawPixel(1, 0, CRGB(0, 255, 0));
	source.drawPixel(2, 0, CRGB(0, 0, 255));
	source.drawPixel(3, 0, CRGB(255, 255, 255));

	source.drawPixel(0, 1, CRGB(128, 0, 0));
	source.drawPixel(1, 1, CRGB(0, 128, 0));
	source.drawPixel(2, 1, CRGB(0, 0, 128));
	source.drawPixel(3, 1, CRGB(128, 128, 128));

	source.drawPixel(0, 2, CRGB(64, 0, 0));
	source.drawPixel(1, 2, CRGB(0, 64, 0));
	source.drawPixel(2, 2, CRGB(0, 0, 64));
	source.drawPixel(3, 2, CRGB(64, 64, 64));

	source.drawPixel(0, 3, CRGB(32, 0, 0));
	source.drawPixel(1, 3, CRGB(0, 32, 0));
	source.drawPixel(2, 3, CRGB(0, 0, 32));
	source.drawPixel(3, 3, CRGB(32, 32, 32));

	downsample(&source, &dest);

	CRGB result = dest.getPixel(0, 0);
	uint32_t expectedR = (255 + 0 + 0 + 255 + 128 + 0 + 0 + 128 + 64 + 0 + 0 + 64 + 32 + 0 + 0 + 32) / 16;
	uint32_t expectedG = (0 + 255 + 0 + 255 + 0 + 128 + 0 + 128 + 0 + 64 + 0 + 64 + 0 + 32 + 0 + 32) / 16;
	uint32_t expectedB = (0 + 0 + 255 + 255 + 0 + 0 + 128 + 128 + 0 + 0 + 64 + 64 + 0 + 0 + 32 + 32) / 16;

	TEST_ASSERT_EQUAL_UINT8(expectedR, result.r);
	TEST_ASSERT_EQUAL_UINT8(expectedG, result.g);
	TEST_ASSERT_EQUAL_UINT8(expectedB, result.b);
}

void test_downsample_black() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.fill(CRGB(0, 0, 0));
	downsample(&source, &dest);

	CRGB result = dest.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(0, result.r);
	TEST_ASSERT_EQUAL_UINT8(0, result.g);
	TEST_ASSERT_EQUAL_UINT8(0, result.b);
}

void test_downsample_white() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	source.fill(CRGB(255, 255, 255));
	downsample(&source, &dest);

	CRGB result = dest.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(255, result.g);
	TEST_ASSERT_EQUAL_UINT8(255, result.b);
}

void test_downsample_32x32_to_8x8() {
	Canvas source(32, 32);
	Canvas dest(8, 8);

	for (uint16_t y = 0; y < 32; y++) {
		for (uint16_t x = 0; x < 32; x++) {
			uint8_t value = (x + y) % 256;
			source.drawPixel(x, y, CRGB(value, value, value));
		}
	}

	downsample(&source, &dest);

	TEST_ASSERT_EQUAL(8, dest.getWidth());
	TEST_ASSERT_EQUAL(8, dest.getHeight());
}

void test_downsample_clears_destination() {
	Canvas source(4, 4);
	Canvas dest(1, 1);

	dest.fill(CRGB(123, 45, 67));

	source.fill(CRGB(255, 128, 64));
	downsample(&source, &dest);

	CRGB result = dest.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(128, result.g);
	TEST_ASSERT_EQUAL_UINT8(64, result.b);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_downsample_16x16_to_4x4_uniform_color);
	RUN_TEST(test_downsample_8x8_to_2x2_quadrants);
	RUN_TEST(test_downsample_color_averaging);
	RUN_TEST(test_downsample_black);
	RUN_TEST(test_downsample_white);
	RUN_TEST(test_downsample_32x32_to_8x8);
	RUN_TEST(test_downsample_clears_destination);
	return UNITY_END();
}
