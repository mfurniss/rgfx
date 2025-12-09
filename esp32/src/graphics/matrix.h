#pragma once
#include <FastLED.h>
#include "coordinate_transforms.h"
#include "config/constants.h"

// Default matrix dimensions defined in config/constants.h:
// - DEFAULT_MATRIX_WIDTH
// - DEFAULT_MATRIX_HEIGHT
// Legacy defines kept for backward compatibility:
#define WIDTH DEFAULT_MATRIX_WIDTH
#define HEIGHT DEFAULT_MATRIX_HEIGHT

enum class LayoutType : uint8_t {
	STRIP = 1,
	MATRIX = 2
};

class Matrix {
   public:
	uint16_t width;
	uint16_t height;
	uint32_t size;
	CRGB* leds;
	uint16_t* coordinateMap;
	String layout;
	LayoutType layoutType;

	// Single panel constructor
	Matrix(uint16_t w, uint16_t h, const String& layoutPattern = "matrix-br-v-snake");

	// Unified multi-panel constructor
	Matrix(uint16_t panelWidth, uint16_t panelHeight,
	       uint8_t unifiedCols, uint8_t unifiedRows,
	       const uint8_t* panelOrder,
	       const uint8_t* panelRotation,
	       const String& layoutPattern = "matrix-br-v-snake");

	~Matrix();
	bool isValid() const;
	void updateLayout(const String& newLayout);
	uint16_t xy(uint16_t x, uint16_t y);
	CRGB& led(uint16_t x, uint16_t y);

	// Panel dimension accessors (for unified panel support)
	uint16_t getPanelWidth() const { return panelWidth; }
	uint16_t getPanelHeight() const { return panelHeight; }
	uint8_t getUnifiedCols() const { return unifiedCols; }
	uint8_t getUnifiedRows() const { return unifiedRows; }

   private:
	// Unified panel configuration (stored for potential future use)
	uint16_t panelWidth;
	uint16_t panelHeight;
	uint8_t unifiedCols;
	uint8_t unifiedRows;
};
