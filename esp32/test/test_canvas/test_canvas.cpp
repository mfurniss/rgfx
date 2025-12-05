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

void test_set_and_get_pixel_crgb() {
	Canvas canvas(10, 10);
	CRGB color(255, 128, 64);

	canvas.drawPixel(5, 5, color);
	CRGB result = canvas.getPixel(5, 5);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(128, result.g);
	TEST_ASSERT_EQUAL_UINT8(64, result.b);
}

void test_set_pixel_at_edges() {
	Canvas canvas(8, 8);
	CRGB red(255, 0, 0);
	CRGB green(0, 255, 0);
	CRGB blue(0, 0, 255);
	CRGB white(255, 255, 255);

	canvas.drawPixel(0, 0, red);
	canvas.drawPixel(7, 0, green);
	canvas.drawPixel(0, 7, blue);
	canvas.drawPixel(7, 7, white);

	TEST_ASSERT_TRUE(red == canvas.getPixel(0, 0));
	TEST_ASSERT_TRUE(green == canvas.getPixel(7, 0));
	TEST_ASSERT_TRUE(blue == canvas.getPixel(0, 7));
	TEST_ASSERT_TRUE(white == canvas.getPixel(7, 7));
}

void test_bounds_checking_out_of_range() {
	Canvas canvas(8, 8);
	CRGB color(255, 0, 0);

	canvas.drawPixel(10, 10, color);

	// Out of bounds should return black
	CRGB result = canvas.getPixel(10, 10);
	TEST_ASSERT_EQUAL_UINT8(0, result.r);
	TEST_ASSERT_EQUAL_UINT8(0, result.g);
	TEST_ASSERT_EQUAL_UINT8(0, result.b);
}

void test_clear_canvas() {
	Canvas canvas(4, 4);

	canvas.fill(CRGB(255, 255, 255));
	canvas.clear();

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			CRGB p = canvas.getPixel(x, y);
			TEST_ASSERT_EQUAL_UINT8(0, p.r);
			TEST_ASSERT_EQUAL_UINT8(0, p.g);
			TEST_ASSERT_EQUAL_UINT8(0, p.b);
		}
	}
}

void test_fill_canvas() {
	Canvas canvas(4, 4);
	CRGB color(128, 64, 32);

	canvas.fill(color);

	for (uint16_t y = 0; y < 4; y++) {
		for (uint16_t x = 0; x < 4; x++) {
			TEST_ASSERT_TRUE(color == canvas.getPixel(x, y));
		}
	}
}

void test_crgba_struct() {
	CRGBA color(0xAA, 0xBB, 0xCC, 0xDD);
	TEST_ASSERT_EQUAL_UINT8(0xAA, color.r);
	TEST_ASSERT_EQUAL_UINT8(0xBB, color.g);
	TEST_ASSERT_EQUAL_UINT8(0xCC, color.b);
	TEST_ASSERT_EQUAL_UINT8(0xDD, color.a);
}

void test_crgba_to_crgb() {
	CRGBA rgba(100, 150, 200, 128);
	CRGB rgb = rgba.toCRGB();
	TEST_ASSERT_EQUAL_UINT8(100, rgb.r);
	TEST_ASSERT_EQUAL_UINT8(150, rgb.g);
	TEST_ASSERT_EQUAL_UINT8(200, rgb.b);
}

void test_crgba_from_crgb() {
	CRGB rgb(100, 150, 200);
	CRGBA rgba(rgb, 128);
	TEST_ASSERT_EQUAL_UINT8(100, rgba.r);
	TEST_ASSERT_EQUAL_UINT8(150, rgba.g);
	TEST_ASSERT_EQUAL_UINT8(200, rgba.b);
	TEST_ASSERT_EQUAL_UINT8(128, rgba.a);
}

void test_get_pixels_pointer() {
	Canvas canvas(4, 4);
	CRGB* pixels = canvas.getPixels();

	TEST_ASSERT_NOT_NULL(pixels);

	pixels[0] = CRGB(255, 0, 0);
	CRGB result = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, result.r);
	TEST_ASSERT_EQUAL_UINT8(0, result.g);
	TEST_ASSERT_EQUAL_UINT8(0, result.b);
}

void test_alpha_blend() {
	Canvas canvas(4, 4);
	canvas.fill(CRGB(0, 0, 0));

	// Draw white with 50% alpha
	canvas.drawPixel(0, 0, CRGBA(255, 255, 255, 128));

	CRGB result = canvas.getPixel(0, 0);
	// 0 * (255-128)/255 + 255 * 128/255 ≈ 128
	TEST_ASSERT_UINT8_WITHIN(2, 128, result.r);
	TEST_ASSERT_UINT8_WITHIN(2, 128, result.g);
	TEST_ASSERT_UINT8_WITHIN(2, 128, result.b);
}

void test_additive_blend() {
	Canvas canvas(4, 4);
	canvas.fill(CRGB(100, 100, 100));

	// Add white with 50% alpha
	canvas.drawPixel(0, 0, CRGBA(255, 255, 255, 128), BlendMode::ADDITIVE);

	CRGB result = canvas.getPixel(0, 0);
	// 100 + 255 * 128/255 ≈ 228
	TEST_ASSERT_UINT8_WITHIN(2, 228, result.r);
}

void test_average_blend() {
	Canvas canvas(4, 4);
	canvas.fill(CRGB(100, 100, 100));

	// Average with 200
	canvas.drawPixel(0, 0, CRGBA(200, 200, 200), BlendMode::AVERAGE);

	CRGB result = canvas.getPixel(0, 0);
	// (100 + 200) / 2 = 150
	TEST_ASSERT_EQUAL_UINT8(150, result.r);
}

void test_replace_blend() {
	Canvas canvas(4, 4);
	canvas.fill(CRGB(100, 100, 100));

	// Replace ignores existing
	canvas.drawPixel(0, 0, CRGBA(200, 150, 100, 50), BlendMode::REPLACE);

	CRGB result = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(200, result.r);
	TEST_ASSERT_EQUAL_UINT8(150, result.g);
	TEST_ASSERT_EQUAL_UINT8(100, result.b);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();

	RUN_TEST(test_canvas_creation);
	RUN_TEST(test_canvas_different_dimensions);
	RUN_TEST(test_set_and_get_pixel_crgb);
	RUN_TEST(test_set_pixel_at_edges);
	RUN_TEST(test_bounds_checking_out_of_range);
	RUN_TEST(test_clear_canvas);
	RUN_TEST(test_fill_canvas);
	RUN_TEST(test_crgba_struct);
	RUN_TEST(test_crgba_to_crgb);
	RUN_TEST(test_crgba_from_crgb);
	RUN_TEST(test_get_pixels_pointer);
	RUN_TEST(test_alpha_blend);
	RUN_TEST(test_additive_blend);
	RUN_TEST(test_average_blend);
	RUN_TEST(test_replace_blend);

	return UNITY_END();
}
