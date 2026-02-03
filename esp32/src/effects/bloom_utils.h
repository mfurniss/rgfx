#pragma once

#include <cstdint>
#include "graphics/canvas.h"

/**
 * Bloom configuration for particle effects.
 * Passed by value for efficiency (3 bytes).
 */
struct BloomConfig {
	uint8_t radius;       // Max spread radius in LEDs (0-4)
	uint8_t intensity;    // Base alpha at center edge (0-255)
	uint8_t bloom;        // Original bloom percentage (0-100) for alpha scaling
};

/**
 * Pre-computed Euclidean distance LUT for 9x9 grid (radius 4).
 * Values are distance * 16 for fixed-point precision.
 * Index = (dy + 4) * 9 + (dx + 4), where dx,dy in [-4, 4].
 */
extern const uint8_t EUCLIDEAN_DIST_LUT[81];

/**
 * Get Euclidean distance from LUT.
 * @param dx X offset from center (-4 to 4)
 * @param dy Y offset from center (-4 to 4)
 * @return Distance * 16 (fixed-point)
 */
inline uint8_t getEuclideanDist16(int8_t dx, int8_t dy) {
	return EUCLIDEAN_DIST_LUT[(dy + 4) * 9 + (dx + 4)];
}

/**
 * Convert bloom percentage (0-100) to spread radius (0-4).
 */
inline uint8_t bloomPercentToRadius(uint8_t percent) {
	uint8_t r = (percent * 4) / 100;
	return (percent > 0 && r == 0) ? 1 : r;
}

/**
 * Render bloom around a point on the canvas.
 *
 * @param canvas    Target canvas (4x resolution)
 * @param centerX   Center X in canvas coords (LED * 4)
 * @param centerY   Center Y in canvas coords (LED * 4)
 * @param color     Base color (bloom fades from this)
 * @param config    Bloom configuration
 * @param isStrip   true for 1D horizontal bloom only
 */
void renderBloom(
	Canvas& canvas,
	uint16_t centerX,
	uint16_t centerY,
	const CRGB& color,
	const BloomConfig& config,
	bool isStrip
);
