#include "sparkle.h"
#include "matrix.h"
#include <FastLED.h>

#define SPARKLE_DENSITY 350
static int i = 0; // random16(SPARKLE_DENSITY);

void sparkle(Matrix& matrix) {
	fadeToBlackBy(matrix.leds, matrix.size, 100);
	EVERY_N_MILLISECONDS(50) {
		// fill_solid(matrix.leds, matrix.size, CRGB::Black);

		while (i < matrix.size) {
			matrix.leds[i] = CRGB::White;
			i += random16(SPARKLE_DENSITY) + 1;
		}

		i -= matrix.size;
	}
}
