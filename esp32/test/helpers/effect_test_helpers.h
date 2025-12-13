/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include <cstdint>
#include "graphics/canvas.h"
#include "hal/types.h"

namespace test_helpers {

/**
 * Bounding box result for findBoundingBox
 */
struct BoundingBox {
	int16_t minX;
	int16_t maxX;
	int16_t minY;
	int16_t maxY;
	bool valid;  // false if no non-black pixels found
};

/**
 * Check if a pixel is non-black (any channel > 0)
 */
inline bool isNonBlack(const CRGB& pixel) {
	return pixel.r != 0 || pixel.g != 0 || pixel.b != 0;
}

/**
 * Count non-black pixels in the canvas
 */
inline int countNonBlackPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Find bounding box of all non-black pixels
 */
inline BoundingBox findBoundingBox(Canvas& canvas) {
	BoundingBox box = {
	    static_cast<int16_t>(canvas.getWidth()),   // minX starts at max
	    -1,                                        // maxX starts at min
	    static_cast<int16_t>(canvas.getHeight()),  // minY starts at max
	    -1,                                        // maxY starts at min
	    false};

	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				if (x < box.minX) box.minX = x;
				if (x > box.maxX) box.maxX = x;
				if (y < box.minY) box.minY = y;
				if (y > box.maxY) box.maxY = y;
				box.valid = true;
			}
		}
	}

	return box;
}

/**
 * Find leftmost non-black pixel X coordinate (-1 if none)
 */
inline int findLeftmostPixelX(Canvas& canvas) {
	for (uint16_t x = 0; x < canvas.getWidth(); x++) {
		for (uint16_t y = 0; y < canvas.getHeight(); y++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return x;
			}
		}
	}
	return -1;
}

/**
 * Find rightmost non-black pixel X coordinate (-1 if none)
 */
inline int findRightmostPixelX(Canvas& canvas) {
	for (int x = canvas.getWidth() - 1; x >= 0; x--) {
		for (uint16_t y = 0; y < canvas.getHeight(); y++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return x;
			}
		}
	}
	return -1;
}

/**
 * Find topmost non-black pixel Y coordinate (-1 if none)
 */
inline int findTopmostPixelY(Canvas& canvas) {
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return y;
			}
		}
	}
	return -1;
}

/**
 * Find bottommost non-black pixel Y coordinate (-1 if none)
 */
inline int findBottommostPixelY(Canvas& canvas) {
	for (int y = canvas.getHeight() - 1; y >= 0; y--) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return y;
			}
		}
	}
	return -1;
}

/**
 * Get pixel at percentage position (0-100 for both x and y)
 */
inline CRGB getPixelAtPercent(Canvas& canvas, float xPercent, float yPercent) {
	uint16_t x = static_cast<uint16_t>((xPercent / 100.0f) * (canvas.getWidth() - 1));
	uint16_t y = static_cast<uint16_t>((yPercent / 100.0f) * (canvas.getHeight() - 1));
	return canvas.getPixel(x, y);
}

/**
 * Check if pixel at position matches expected color within tolerance
 */
inline bool pixelMatches(Canvas& canvas, uint16_t x, uint16_t y, uint8_t expectedR,
                         uint8_t expectedG, uint8_t expectedB, uint8_t tolerance = 5) {
	CRGB pixel = canvas.getPixel(x, y);
	int dr = static_cast<int>(pixel.r) - static_cast<int>(expectedR);
	int dg = static_cast<int>(pixel.g) - static_cast<int>(expectedG);
	int db = static_cast<int>(pixel.b) - static_cast<int>(expectedB);
	return (dr >= -tolerance && dr <= tolerance && dg >= -tolerance && dg <= tolerance &&
	        db >= -tolerance && db <= tolerance);
}

/**
 * Check if canvas is completely black (all pixels are 0,0,0)
 */
inline bool isCanvasEmpty(Canvas& canvas) {
	return countNonBlackPixels(canvas) == 0;
}

/**
 * Count pixels that have a specific color channel dominant
 * Useful for verifying color correctness
 */
inline int countRedDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > p.g && p.r > p.b && p.r > 0) {
				count++;
			}
		}
	}
	return count;
}

inline int countGreenDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.g > p.r && p.g > p.b && p.g > 0) {
				count++;
			}
		}
	}
	return count;
}

inline int countBlueDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.b > p.r && p.b > p.g && p.b > 0) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Calculate total brightness of canvas (sum of all RGB values)
 * Useful for verifying fading effects
 */
inline uint64_t calculateTotalBrightness(Canvas& canvas) {
	uint64_t total = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			total += p.r + p.g + p.b;
		}
	}
	return total;
}

/**
 * Get maximum brightness value in canvas
 */
inline uint8_t getMaxBrightness(Canvas& canvas) {
	uint8_t maxVal = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > maxVal) maxVal = p.r;
			if (p.g > maxVal) maxVal = p.g;
			if (p.b > maxVal) maxVal = p.b;
		}
	}
	return maxVal;
}

/**
 * Count pixels in a specific quadrant (0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right)
 */
inline int countPixelsInQuadrant(Canvas& canvas, int quadrant) {
	int count = 0;
	uint16_t midX = canvas.getWidth() / 2;
	uint16_t midY = canvas.getHeight() / 2;

	uint16_t startX = (quadrant == 1 || quadrant == 3) ? midX : 0;
	uint16_t endX = (quadrant == 1 || quadrant == 3) ? canvas.getWidth() : midX;
	uint16_t startY = (quadrant == 2 || quadrant == 3) ? midY : 0;
	uint16_t endY = (quadrant == 2 || quadrant == 3) ? canvas.getHeight() : midY;

	for (uint16_t y = startY; y < endY; y++) {
		for (uint16_t x = startX; x < endX; x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				count++;
			}
		}
	}
	return count;
}

}  // namespace test_helpers
