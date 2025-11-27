#pragma once

#include "effects/effect_processor.h"
#include "matrix.h"
#include "canvas.h"
#include <FastLED.h>
#include <cstdlib>

template <size_t N>
void downsampleToMatrix(EffectProcessor::EffectEntry (&effects)[N], Matrix* matrix) {
	if (!matrix || !matrix->isValid()) {
		return;
	}

	uint16_t width = matrix->width;
	uint16_t height = matrix->height;
	uint32_t size = width * height;

	CRGB* rgbArray = (CRGB*)malloc(size * sizeof(CRGB));
	if (!rgbArray) {
		return;
	}

	for (uint32_t i = 0; i < size; i++) {
		rgbArray[i] = CRGB::Black;
	}

	for (const auto& entry : effects) {
		Canvas& canvas = entry.effect->getCanvas();

		if (matrix->layoutType == LayoutType::STRIP) {
			for (uint16_t x = 0; x < width; x++) {
				uint32_t rSum = 0, gSum = 0, bSum = 0, aSum = 0;

				for (uint16_t bx = 0; bx < 4; bx++) {
					uint32_t rgba = canvas.getPixel(x * 4 + bx, 0);
					rSum += RGBA_RED(rgba);
					gSum += RGBA_GREEN(rgba);
					bSum += RGBA_BLUE(rgba);
					aSum += RGBA_ALPHA(rgba);
				}

				uint8_t avgR = rSum >> 2;
				uint8_t avgG = gSum >> 2;
				uint8_t avgB = bSum >> 2;
				uint8_t avgA = aSum >> 2;

				CRGB existing = rgbArray[x];

				uint8_t finalR = ((existing.r * (255 - avgA)) + (avgR * avgA)) / 255;
				uint8_t finalG = ((existing.g * (255 - avgA)) + (avgG * avgA)) / 255;
				uint8_t finalB = ((existing.b * (255 - avgA)) + (avgB * avgA)) / 255;

				rgbArray[x] = CRGB(finalR, finalG, finalB);
			}
		} else {
			for (uint16_t y = 0; y < height; y++) {
				for (uint16_t x = 0; x < width; x++) {
					uint32_t rSum = 0, gSum = 0, bSum = 0, aSum = 0;

					for (uint16_t by = 0; by < 4; by++) {
						for (uint16_t bx = 0; bx < 4; bx++) {
							uint32_t rgba = canvas.getPixel(x * 4 + bx, y * 4 + by);
							rSum += RGBA_RED(rgba);
							gSum += RGBA_GREEN(rgba);
							bSum += RGBA_BLUE(rgba);
							aSum += RGBA_ALPHA(rgba);
						}
					}

					uint8_t avgR = rSum >> 4;
					uint8_t avgG = gSum >> 4;
					uint8_t avgB = bSum >> 4;
					uint8_t avgA = aSum >> 4;

					uint32_t index = x + y * width;
					CRGB existing = rgbArray[index];

					uint8_t finalR = ((existing.r * (255 - avgA)) + (avgR * avgA)) / 255;
					uint8_t finalG = ((existing.g * (255 - avgA)) + (avgG * avgA)) / 255;
					uint8_t finalB = ((existing.b * (255 - avgA)) + (avgB * avgA)) / 255;

					rgbArray[index] = CRGB(finalR, finalG, finalB);
				}
			}
		}
	}

	for (uint16_t y = 0; y < height; y++) {
		for (uint16_t x = 0; x < width; x++) {
			uint32_t logicalIndex = x + y * width;
			matrix->led(x, y) = rgbArray[logicalIndex];
		}
	}

	free(rgbArray);
}
