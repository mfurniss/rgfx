#pragma once

#include "matrix.h"
#include "canvas.h"
#include <FastLED.h>

// Downsample a single canvas to the LED matrix
// Canvas is 4x the matrix resolution for supersampling
inline void downsampleToMatrix(Canvas& canvas, Matrix* matrix) {
	if (!matrix || !matrix->isValid() || !canvas.isValid()) {
		return;
	}

	uint16_t width = matrix->width;
	uint16_t height = matrix->height;

	if (matrix->layoutType == LayoutType::STRIP) {
		// 1D strip: downsample 4 canvas pixels to 1 LED
		for (uint16_t x = 0; x < width; x++) {
			uint32_t rSum = 0, gSum = 0, bSum = 0;

			for (uint16_t bx = 0; bx < 4; bx++) {
				uint32_t rgba = canvas.getPixel(x * 4 + bx, 0);
				uint8_t alpha = RGBA_ALPHA(rgba);
				rSum += (RGBA_RED(rgba) * alpha) / 255;
				gSum += (RGBA_GREEN(rgba) * alpha) / 255;
				bSum += (RGBA_BLUE(rgba) * alpha) / 255;
			}

			matrix->led(x, 0) = CRGB(rSum >> 2, gSum >> 2, bSum >> 2);
		}
	} else {
		// 2D matrix: downsample 4x4 canvas pixels to 1 LED
		for (uint16_t y = 0; y < height; y++) {
			for (uint16_t x = 0; x < width; x++) {
				uint32_t rSum = 0, gSum = 0, bSum = 0;

				for (uint16_t by = 0; by < 4; by++) {
					for (uint16_t bx = 0; bx < 4; bx++) {
						uint32_t rgba = canvas.getPixel(x * 4 + bx, y * 4 + by);
						uint8_t alpha = RGBA_ALPHA(rgba);
						rSum += (RGBA_RED(rgba) * alpha) / 255;
						gSum += (RGBA_GREEN(rgba) * alpha) / 255;
						bSum += (RGBA_BLUE(rgba) * alpha) / 255;
					}
				}

				matrix->led(x, y) = CRGB(rSum >> 4, gSum >> 4, bSum >> 4);
			}
		}
	}
}
