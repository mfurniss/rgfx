#include "matrix.h"
#include "log.h"
#include <cstdlib>

// Single panel constructor
Matrix::Matrix(uint16_t w, uint16_t h, const String& layoutPattern)
    : width(w),
      height(h),
      size(w * h),
      leds(nullptr),
      coordinateMap(nullptr),
      layout(layoutPattern),
      layoutType((layoutPattern == "strip") ? LayoutType::STRIP : LayoutType::MATRIX),
      panelWidth(w),
      panelHeight(h),
      unifiedCols(1),
      unifiedRows(1) {
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

// Unified multi-panel constructor
Matrix::Matrix(uint16_t pWidth, uint16_t pHeight,
               uint8_t uCols, uint8_t uRows,
               const uint8_t* panelOrder,
               const String& layoutPattern)
    : width(pWidth * uCols),
      height(pHeight * uRows),
      size((uint32_t)pWidth * uCols * pHeight * uRows),
      leds(nullptr),
      coordinateMap(nullptr),
      layout(layoutPattern),
      layoutType((layoutPattern == "strip") ? LayoutType::STRIP : LayoutType::MATRIX),
      panelWidth(pWidth),
      panelHeight(pHeight),
      unifiedCols(uCols),
      unifiedRows(uRows) {
	leds = (CRGB*)malloc(size * sizeof(CRGB));
	if (!leds) {
		log("ERROR: Failed to allocate LED buffer for unified display");
		return;
	}

	coordinateMap = buildUnifiedCoordinateMap(
	    panelWidth, panelHeight,
	    unifiedCols, unifiedRows,
	    panelOrder,
	    layout.c_str()
	);
	if (!coordinateMap) {
		log("ERROR: Failed to allocate unified coordinate map");
		free(leds);
		leds = nullptr;
		return;
	}

	log("Unified matrix created: " + String(width) + "x" + String(height) +
	    " (" + String(unifiedCols) + "x" + String(unifiedRows) + " panels of " +
	    String(panelWidth) + "x" + String(panelHeight) + ")");
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
