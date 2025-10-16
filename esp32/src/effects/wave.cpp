#include "wave.h"
#include "matrix.h"
#include <FastLED.h>

static uint8_t hue = 0;
static uint16_t x = 0;

void wave(Matrix& matrix) {
	fadeToBlackBy(matrix.leds, matrix.size, 40);
	uint8_t sin = beatsin8(111, 0, matrix.height - 1, 0, 0);
	matrix.led(matrix.width - x, sin) = CHSV(hue, 255, 255);

	EVERY_N_MILLISECONDS(30) {
		x = (x + 1) % matrix.width;
	}

	EVERY_N_MILLISECONDS(16) {
		hue += 5;
	}
}