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
               const uint8_t* panelRotation,
               const String& layoutPattern)
    : leds(nullptr),
      coordinateMap(nullptr),
      layout(layoutPattern),
      layoutType((layoutPattern == "strip") ? LayoutType::STRIP : LayoutType::MATRIX),
      panelWidth(pWidth),
      panelHeight(pHeight),
      unifiedCols(uCols),
      unifiedRows(uRows) {
	// Calculate effective panel dimensions after rotation
	// For 90°/270° rotations, width and height swap in the logical display
	uint8_t firstRotation = panelRotation[0];
	bool dimsSwapped = (firstRotation == 1 || firstRotation == 3);
	uint16_t effectivePanelWidth = dimsSwapped ? pHeight : pWidth;
	uint16_t effectivePanelHeight = dimsSwapped ? pWidth : pHeight;

	// Set unified display dimensions using effective panel size
	width = effectivePanelWidth * uCols;
	height = effectivePanelHeight * uRows;
	size = (uint32_t)width * height;

	leds = (CRGB*)malloc(size * sizeof(CRGB));
	if (!leds) {
		log("ERROR: Failed to allocate LED buffer for unified display");
		return;
	}

	// Log rotation values being used for coordinate map
	String rotDebug = "Building coord map with rotations: [";
	uint8_t panelCount = uCols * uRows;
	for (uint8_t i = 0; i < panelCount; i++) {
		if (i > 0) rotDebug += ", ";
		rotDebug += String(panelRotation[i]);
	}
	rotDebug += "]";
	log(rotDebug);

	coordinateMap = buildUnifiedCoordinateMap(
	    panelWidth, panelHeight,
	    unifiedCols, unifiedRows,
	    panelOrder,
	    panelRotation,
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
	    String(panelWidth) + "x" + String(panelHeight) +
	    (dimsSwapped ? " rotated" : "") + ")");
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
