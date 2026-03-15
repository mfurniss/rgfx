#include "downsample_to_matrix.h"

// Downsample a single canvas to the LED matrix.
// Canvas is 4x the matrix resolution for supersampling.
// Applies gamma correction using precomputed lookup tables.
// Optimized: direct buffer access eliminates bounds checking overhead.
// IRAM_ATTR: places the function body in IRAM to avoid flash instruction-cache
// pressure on a hot path called every frame. The function must NOT be inline
// when used with IRAM_ATTR on Xtensa — large inline functions cause the linker
// to emit "dangerous relocation: l32r: literal placed after use" errors because
// the literal pool for global references ends up out of range from the IRAM body.
IRAM_ATTR void downsampleToMatrix(Canvas& canvas, Matrix* matrix) {
	if (!matrix || !matrix->isValid() || !canvas.isValid()) {
		return;
	}

	const uint16_t width = matrix->width;
	const uint16_t height = matrix->height;
	const CRGB* pixels = canvas.getPixels();
	const uint16_t canvasWidth = canvas.getWidth();

	if (matrix->layoutType == LayoutType::STRIP) {
		// 1D strip: downsample 4 canvas pixels to 1 LED
		// Canvas row 0 only, pixels are contiguous
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
		// 2D matrix: downsample 4x4 canvas pixels to 1 LED
		for (uint16_t y = 0; y < height; y++) {
			const uint16_t canvasY = y * 4;
			for (uint16_t x = 0; x < width; x++) {
				const uint16_t canvasX = x * 4;

				// Direct pointer to start of 4x4 block
				const CRGB* row0 = pixels + (canvasY * canvasWidth) + canvasX;
				const CRGB* row1 = row0 + canvasWidth;
				const CRGB* row2 = row1 + canvasWidth;
				const CRGB* row3 = row2 + canvasWidth;

				// Sum all 16 pixels (4 per row)
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
