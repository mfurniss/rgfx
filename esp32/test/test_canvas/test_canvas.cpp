/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include "canvas.h"
#include "canvas.cpp"

void setUp(void) {}

void tearDown(void) {}

void test_canvas_creation() {
	Canvas canvas(16, 16);
	TEST_ASSERT_EQUAL(16, canvas.getWidth());
	TEST_ASSERT_EQUAL(16, canvas.getHeight());
	TEST_ASSERT_EQUAL(256, canvas.getSize());
}

void test_canvas_different_dimensions() {
	Canvas canvas(8, 32);
	TEST_ASSERT_EQUAL(8, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
	TEST_ASSERT_EQUAL(256, canvas.getSize());
}

void test_set_and_get_pixel() {
	Canvas canvas(10, 10);
	uint32_t color = RGBA(255, 128, 64, 255);

	canvas.drawPixel(5, 5, color);
	TEST_ASSERT_EQUAL_UINT32(color, canvas.getPixel(5, 5));
}

void test_set_pixel_at_edges() {
	Canvas canvas(8, 8);
	uint32_t red = RGBA(255, 0, 0, 255);
	uint32_t green = RGBA(0, 255, 0, 255);
	uint32_t blue = RGBA(0, 0, 255, 255);
	uint32_t white = RGBA(255, 255, 255, 255);

	canvas.drawPixel(0, 0, red);
	canvas.drawPixel(7, 0, green);
	canvas.drawPixel(0, 7, blue);
	canvas.drawPixel(7, 7, white);

	TEST_ASSERT_EQUAL_UINT32(red, canvas.getPixel(0, 0));
	TEST_ASSERT_EQUAL_UINT32(green, canvas.getPixel(7, 0));
	TEST_ASSERT_EQUAL_UINT32(blue, canvas.getPixel(0, 7));
	TEST_ASSERT_EQUAL_UINT32(white, canvas.getPixel(7, 7));
}

void test_bounds_checking_out_of_range() {
	Canvas canvas(8, 8);
	uint32_t color = RGBA(255, 0, 0, 255);

	canvas.drawPixel(10, 10, color);

	TEST_ASSERT_EQUAL_UINT32(0, canvas.getPixel(10, 10));
}

void test_clear_canvas() {
	Canvas canvas(4, 4);

	canvas.fill(RGBA(255, 255, 255, 255));
	canvas.clear();

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			TEST_ASSERT_EQUAL_UINT32(0, canvas.getPixel(x, y));
		}
	}
}

void test_fill_canvas() {
	Canvas canvas(4, 4);
	uint32_t color = RGBA(128, 64, 32, 16);

	canvas.fill(color);

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			TEST_ASSERT_EQUAL_UINT32(color, canvas.getPixel(x, y));
		}
	}
}

void test_rgba_macro() {
	uint32_t color = RGBA(0xAA, 0xBB, 0xCC, 0xDD);
	TEST_ASSERT_EQUAL_UINT32(0xAABBCCDD, color);
}

void test_rgba_extraction_macros() {
	uint32_t color = RGBA(0xAA, 0xBB, 0xCC, 0xDD);

	TEST_ASSERT_EQUAL_UINT8(0xAA, RGBA_RED(color));
	TEST_ASSERT_EQUAL_UINT8(0xBB, RGBA_GREEN(color));
	TEST_ASSERT_EQUAL_UINT8(0xCC, RGBA_BLUE(color));
	TEST_ASSERT_EQUAL_UINT8(0xDD, RGBA_ALPHA(color));
}

void test_get_pixels_pointer() {
	Canvas canvas(4, 4);
	uint32_t* pixels = canvas.getPixels();

	TEST_ASSERT_NOT_NULL(pixels);

	pixels[0] = RGBA(255, 0, 0, 255);
	TEST_ASSERT_EQUAL_UINT32(RGBA(255, 0, 0, 255), canvas.getPixel(0, 0));
}

int main(int argc, char** argv) {
	UNITY_BEGIN();

	RUN_TEST(test_canvas_creation);
	RUN_TEST(test_canvas_different_dimensions);
	RUN_TEST(test_set_and_get_pixel);
	RUN_TEST(test_set_pixel_at_edges);
	RUN_TEST(test_bounds_checking_out_of_range);
	RUN_TEST(test_clear_canvas);
	RUN_TEST(test_fill_canvas);
	RUN_TEST(test_rgba_macro);
	RUN_TEST(test_rgba_extraction_macros);
	RUN_TEST(test_get_pixels_pointer);

	return UNITY_END();
}
