/**
 * Downsample Test Helpers
 *
 * Provides gamma correction and canvas-to-matrix downsampling for native tests.
 * This replicates the production downsampleToMatrix() without Arduino dependencies.
 *
 * USAGE: Include this file BEFORE pixel_digest.h in test files.
 */

#pragma once

#include <cstdint>
#include <cmath>
#include "hal/types.h"
#include "graphics/canvas.h"
#include "graphics/matrix.h"

// =============================================================================
// Driver Config for Tests (mirrors production DriverConfigData)
// =============================================================================

struct DriverConfigData {
	float gammaR = 1.0f;
	float gammaG = 1.0f;
	float gammaB = 1.0f;
	uint8_t floorR = 0;
	uint8_t floorG = 0;
	uint8_t floorB = 0;
};

// Global instances required by pixel_digest.h
inline DriverConfigData g_driverConfig;
inline uint8_t g_gammaLutR[256];
inline uint8_t g_gammaLutG[256];
inline uint8_t g_gammaLutB[256];

/**
 * Rebuild gamma lookup tables from current g_driverConfig values
 */
inline void rebuildGammaLUT() {
	for (int i = 0; i < 256; i++) {
		float normalized = i / 255.0f;
		uint8_t correctedR = (uint8_t)(powf(normalized, g_driverConfig.gammaR) * 255.0f + 0.5f);
		uint8_t correctedG = (uint8_t)(powf(normalized, g_driverConfig.gammaG) * 255.0f + 0.5f);
		uint8_t correctedB = (uint8_t)(powf(normalized, g_driverConfig.gammaB) * 255.0f + 0.5f);
		g_gammaLutR[i] = (correctedR <= g_driverConfig.floorR) ? 0 : correctedR;
		g_gammaLutG[i] = (correctedG <= g_driverConfig.floorG) ? 0 : correctedG;
		g_gammaLutB[i] = (correctedB <= g_driverConfig.floorB) ? 0 : correctedB;
	}
}

/**
 * Downsample 4x supersampled canvas to matrix with gamma correction
 * Mirrors production downsampleToMatrix() from driver_config.cpp
 */
inline void downsampleToMatrix(Canvas& canvas, Matrix* matrix) {
	if (!matrix || !matrix->isValid() || !canvas.isValid()) return;

	const uint16_t width = matrix->width;
	const uint16_t height = matrix->height;
	const CRGB* pixels = canvas.getPixels();
	const uint16_t canvasWidth = canvas.getWidth();

	if (matrix->layoutType == LayoutType::STRIP) {
		// 1D strip: average 4 horizontal pixels
		for (uint16_t x = 0; x < width; x++) {
			const CRGB* block = pixels + (x * 4);
			uint16_t rSum = block[0].r + block[1].r + block[2].r + block[3].r;
			uint16_t gSum = block[0].g + block[1].g + block[2].g + block[3].g;
			uint16_t bSum = block[0].b + block[1].b + block[2].b + block[3].b;
			matrix->led(x, 0) = CRGB(
				g_gammaLutR[rSum >> 2],
				g_gammaLutG[gSum >> 2],
				g_gammaLutB[bSum >> 2]
			);
		}
	} else {
		// 2D matrix: average 4x4 pixel blocks
		for (uint16_t y = 0; y < height; y++) {
			const uint16_t canvasY = y * 4;
			for (uint16_t x = 0; x < width; x++) {
				const uint16_t canvasX = x * 4;
				const CRGB* row0 = pixels + (canvasY * canvasWidth) + canvasX;
				const CRGB* row1 = row0 + canvasWidth;
				const CRGB* row2 = row1 + canvasWidth;
				const CRGB* row3 = row2 + canvasWidth;

				uint16_t rSum = row0[0].r + row0[1].r + row0[2].r + row0[3].r
				              + row1[0].r + row1[1].r + row1[2].r + row1[3].r
				              + row2[0].r + row2[1].r + row2[2].r + row2[3].r
				              + row3[0].r + row3[1].r + row3[2].r + row3[3].r;
				uint16_t gSum = row0[0].g + row0[1].g + row0[2].g + row0[3].g
				              + row1[0].g + row1[1].g + row1[2].g + row1[3].g
				              + row2[0].g + row2[1].g + row2[2].g + row2[3].g
				              + row3[0].g + row3[1].g + row3[2].g + row3[3].g;
				uint16_t bSum = row0[0].b + row0[1].b + row0[2].b + row0[3].b
				              + row1[0].b + row1[1].b + row1[2].b + row1[3].b
				              + row2[0].b + row2[1].b + row2[2].b + row2[3].b
				              + row3[0].b + row3[1].b + row3[2].b + row3[3].b;

				matrix->led(x, y) = CRGB(
					g_gammaLutR[rSum >> 4],
					g_gammaLutG[gSum >> 4],
					g_gammaLutB[bSum >> 4]
				);
			}
		}
	}
}
