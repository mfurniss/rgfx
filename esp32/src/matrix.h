#pragma once
#include <FastLED.h>

#define WIDTH  8
#define HEIGHT 8

class Matrix {
public:
	uint16_t width;
	uint16_t height;
	uint32_t size;
	CRGB* leds;
	Matrix(uint16_t w, uint16_t h);
	~Matrix();
	uint16_t xy(uint16_t x, uint16_t y);
	CRGB& led(uint16_t x, uint16_t y);
};
