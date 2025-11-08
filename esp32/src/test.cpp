#include "test.h"
#include "matrix.h"
#include <FastLED.h>

void test(Matrix& matrix, uint32_t color) {
	// Ignore color parameter - we use fixed test colors

	// Strip: 25% segments (Red, Green, Blue, Yellow)
	if (matrix.layout == "strip") {
		uint16_t segmentSize = matrix.width / 4;
		for (uint16_t x = 0; x < matrix.width; x++) {
			uint8_t segment = x / segmentSize;
			CRGB colors[] = {CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::Yellow};
			matrix.led(x, 0) = colors[segment];
		}
	}
	// Matrix: 4 quadrants (TL=Red, TR=Green, BL=Blue, BR=Yellow)
	else {
		uint8_t midX = matrix.width / 2;
		uint8_t midY = matrix.height / 2;
		for (uint8_t y = 0; y < matrix.height; y++) {
			for (uint8_t x = 0; x < matrix.width; x++) {
				if (y < midY) {
					matrix.led(x, y) = (x < midX) ? CRGB::Red : CRGB::Green;
				} else {
					matrix.led(x, y) = (x < midX) ? CRGB::Blue : CRGB::Yellow;
				}
			}
		}
	}
}
