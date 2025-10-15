#include "matrix.h"

Matrix::Matrix(uint16_t w, uint16_t h) {
	width = w;
	height = h;
	size = width * height;
	leds = new CRGB[size];
}

Matrix::~Matrix() {
	delete[] leds;
}

uint16_t Matrix::xy(uint16_t x, uint16_t y) {
	if (x & 1) {
		return height * (width - x) - (y + 1);
	} else {
		return height * (width - (x + 1)) + y;
	}
}

CRGB& Matrix::led(uint16_t x, uint16_t y) {
	return leds[xy(x, y)];
}
