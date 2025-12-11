#pragma once

#include "matrix.h"
#include "canvas.h"
#include "driver_config.h"
#include <FastLED.h>
#include <cmath>

// Gamma correction lookup tables (256 bytes each, generated from gamma values)
// These are rebuilt when config changes via rebuildGammaLUT()
extern uint8_t g_gammaLutR[256];
extern uint8_t g_gammaLutG[256];
extern uint8_t g_gammaLutB[256];

// Rebuild gamma lookup tables from current config
// Call this after receiving new gamma values from Hub
inline void rebuildGammaLUT() {
	float gammaR = g_driverConfig.gammaR;
	float gammaG = g_driverConfig.gammaG;
	float gammaB = g_driverConfig.gammaB;

	for (int i = 0; i < 256; i++) {
		float normalized = i / 255.0f;
		g_gammaLutR[i] = (uint8_t)(powf(normalized, gammaR) * 255.0f + 0.5f);
		g_gammaLutG[i] = (uint8_t)(powf(normalized, gammaG) * 255.0f + 0.5f);
		g_gammaLutB[i] = (uint8_t)(powf(normalized, gammaB) * 255.0f + 0.5f);
	}
}

// Downsample a single canvas to the LED matrix
// Canvas is 4x the matrix resolution for supersampling
// Applies gamma correction using precomputed lookup tables
inline void downsampleToMatrix(Canvas& canvas, Matrix* matrix) {
	if (!matrix || !matrix->isValid() || !canvas.isValid()) {
		return;
	}

	uint16_t width = matrix->width;
	uint16_t height = matrix->height;

	if (matrix->layoutType == LayoutType::STRIP) {
		// 1D strip: downsample 4 canvas pixels to 1 LED
		for (uint16_t x = 0; x < width; x++) {
			uint16_t rSum = 0, gSum = 0, bSum = 0;

			for (uint16_t bx = 0; bx < 4; bx++) {
				CRGB pixel = canvas.getPixel(x * 4 + bx, 0);
				rSum += pixel.r;
				gSum += pixel.g;
				bSum += pixel.b;
			}

			// Apply gamma correction via LUT
			matrix->led(x, 0) = CRGB(
				g_gammaLutR[rSum >> 2],
				g_gammaLutG[gSum >> 2],
				g_gammaLutB[bSum >> 2]
			);
		}
	} else {
		// 2D matrix: downsample 4x4 canvas pixels to 1 LED
		for (uint16_t y = 0; y < height; y++) {
			for (uint16_t x = 0; x < width; x++) {
				uint16_t rSum = 0, gSum = 0, bSum = 0;

				for (uint16_t by = 0; by < 4; by++) {
					for (uint16_t bx = 0; bx < 4; bx++) {
						CRGB pixel = canvas.getPixel(x * 4 + bx, y * 4 + by);
						rSum += pixel.r;
						gSum += pixel.g;
						bSum += pixel.b;
					}
				}

				// Apply gamma correction via LUT
				matrix->led(x, y) = CRGB(
					g_gammaLutR[rSum >> 4],
					g_gammaLutG[gSum >> 4],
					g_gammaLutB[bSum >> 4]
				);
			}
		}
	}
}
