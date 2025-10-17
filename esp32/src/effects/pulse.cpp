#include "pulse.h"
#include "matrix.h"
#include <FastLED.h>

void pulse(Matrix& matrix, uint32_t color) {
	fill_solid(matrix.leds, matrix.size, color);
}
