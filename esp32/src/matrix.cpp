#include "matrix.h"

Matrix::Matrix(uint16_t w, uint16_t h, const String& layoutPattern) {
	width = w;
	height = h;
	size = width * height;
	layout = layoutPattern;
	layoutType = (layout == "strip") ? LayoutType::STRIP : LayoutType::MATRIX;
	leds = new CRGB[size];
	coordinateMap = buildCoordinateMap(width, height, layout.c_str());
}

void Matrix::updateLayout(const String& newLayout) {
	if (newLayout != layout) {
		layout = newLayout;
		layoutType = (layout == "strip") ? LayoutType::STRIP : LayoutType::MATRIX;
		// Rebuild coordinate map with new layout
		delete[] coordinateMap;
		coordinateMap = buildCoordinateMap(width, height, layout.c_str());
	}
}

Matrix::~Matrix() {
	delete[] leds;
	delete[] coordinateMap;
}

uint16_t Matrix::xy(uint16_t x, uint16_t y) {
	return coordinateMap[y * width + x];
}

CRGB& Matrix::led(uint16_t x, uint16_t y) {
	return leds[xy(x, y)];
}
