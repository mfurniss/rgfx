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
	Matrix(uint16_t w, uint16_t h, const String& layoutPattern = "matrix-br-v-snake");
	~Matrix();
	void updateLayout(const String& newLayout);
	uint16_t xy(uint16_t x, uint16_t y);
	CRGB& led(uint16_t x, uint16_t y);
};
