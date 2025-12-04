#include "matrix.h"
#include "log.h"
#include <cstdlib>

Matrix::Matrix(uint16_t w, uint16_t h, const String& layoutPattern)
    : width(w),
      height(h),
      size(w * h),
      leds(nullptr),
      coordinateMap(nullptr),
      layout(layoutPattern),
      layoutType((layoutPattern == "strip") ? LayoutType::STRIP : LayoutType::MATRIX) {
	leds = (CRGB*)malloc(size * sizeof(CRGB));
	if (!leds) {
		log("ERROR: Failed to allocate LED buffer");
		return;
	}

	coordinateMap = buildCoordinateMap(width, height, layout.c_str());
	if (!coordinateMap) {
		log("ERROR: Failed to allocate coordinate map");
		free(leds);
		leds = nullptr;
		return;
	}
}

bool Matrix::isValid() const {
	return leds != nullptr && coordinateMap != nullptr;
}

void Matrix::updateLayout(const String& newLayout) {
	if (!coordinateMap || newLayout == layout) {
		return;
	}

	layout = newLayout;
	layoutType = (layout == "strip") ? LayoutType::STRIP : LayoutType::MATRIX;

	free(coordinateMap);
	coordinateMap = buildCoordinateMap(width, height, layout.c_str());
	if (!coordinateMap) {
		log("ERROR: Failed to reallocate coordinate map");
	}
}

Matrix::~Matrix() {
	free(leds);
	free(coordinateMap);
}

uint16_t Matrix::xy(uint16_t x, uint16_t y) {
	return coordinateMap[y * width + x];
}

CRGB& Matrix::led(uint16_t x, uint16_t y) {
	return leds[xy(x, y)];
}
