#include "fire.h"
#include "matrix.h"
#include <FastLED.h>
#include <algorithm>

DEFINE_GRADIENT_PALETTE(heatmap_gp){0,   0,   0,   0, 120, 200, 0,   0,
                                    180, 255, 158, 0, 255, 255, 255, 255};

CRGBPalette16 myPal = heatmap_gp;
static uint8_t heat[WIDTH][HEIGHT];

void fire(Matrix& matrix, bool on) {
	EVERY_N_MILLISECONDS(30) {
		uint8_t f = beatsin8(1, 0, 150, 0, 0);

		for (int x = 0; x < matrix.width; x++) {
			for (int y = 0; y < matrix.height; y++) {
				heat[x][y] = qsub8(heat[x][y], random8(37 - x));
			}
		}

		for (int x = matrix.width - 1; x >= 0; x--) {
			for (int y = 0; y < matrix.height; y++) {
				if (x > 0) {
					heat[x][y] = heat[x - 1][y];
				}
			}
		}

		if (on) {
			for (int y = 0; y < matrix.height; y++) {
				heat[0][y] = qsub8(random8(130, 240), f);
			}

			// random spark
			if (random8(20) == 0) {
				heat[0][random8(matrix.height)] = random8(200, 240);
			}
		}

		for (int x = 0; x < matrix.width; x++) {
			for (int y = 0; y < matrix.height; y++) {
				int h = heat[x][y];
				// h = qsub8(h, f);
				matrix.led(matrix.width - x, y) = ColorFromPalette(myPal, h);
			}
		}
	}
}
