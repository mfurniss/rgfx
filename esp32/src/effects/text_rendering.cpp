#include "text_rendering.h"

void renderChar(Canvas& canvas, char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b) {
	const uint8_t* glyph = getGlyph(c);
	if (glyph == nullptr) {
		return;
	}

	CRGB color(r, g, b);

	for (uint8_t row = 0; row < FONT_CHAR_HEIGHT; row++) {
		uint8_t rowData = pgm_read_byte(&glyph[row]);
		for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
			if (rowData & (0x80 >> col)) {
				int16_t px = x + (col * TEXT_SCALE);
				int16_t py = y + (row * TEXT_SCALE);
				// Use signed overload - Canvas handles clipping
				canvas.drawRectangle(px, py, TEXT_SCALE, TEXT_SCALE, color);
			}
		}
	}
}

void renderChar(Canvas& canvas, char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b, BlendMode mode) {
	renderChar(canvas, c, x, y, r, g, b, 255, mode);
}

void renderChar(Canvas& canvas, char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b, uint8_t alpha, BlendMode mode) {
	const uint8_t* glyph = getGlyph(c);
	if (glyph == nullptr) {
		return;
	}

	CRGBA color(r, g, b, alpha);

	for (uint8_t row = 0; row < FONT_CHAR_HEIGHT; row++) {
		uint8_t rowData = pgm_read_byte(&glyph[row]);
		for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
			if (rowData & (0x80 >> col)) {
				int16_t px = x + (col * TEXT_SCALE);
				int16_t py = y + (row * TEXT_SCALE);
				canvas.drawRectangle(px, py, TEXT_SCALE, TEXT_SCALE, color, mode);
			}
		}
	}
}
