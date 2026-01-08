#include "text_rendering.h"

void renderChar(Canvas& canvas, char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b) {
	const uint8_t* glyph = getGlyph(c);
	if (glyph == nullptr) {
		return;
	}

	CRGB color(r, g, b);

	// Fast path: entire character within canvas bounds
	if (x >= 0 && y >= 0 &&
		x + TEXT_CHAR_WIDTH <= canvas.getWidth() && y + TEXT_CHAR_HEIGHT <= canvas.getHeight()) {
		for (uint8_t row = 0; row < FONT_CHAR_HEIGHT; row++) {
			uint8_t rowData = pgm_read_byte(&glyph[row]);
			for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
				if (rowData & (0x80 >> col)) {
					canvas.fillBlock4x4(
						static_cast<uint16_t>(x + col * TEXT_SCALE),
						static_cast<uint16_t>(y + row * TEXT_SCALE),
						color);
				}
			}
		}
		return;
	}

	// Slow path: needs clipping
	for (uint8_t row = 0; row < FONT_CHAR_HEIGHT; row++) {
		uint8_t rowData = pgm_read_byte(&glyph[row]);
		for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
			if (rowData & (0x80 >> col)) {
				int16_t px = x + col * TEXT_SCALE;
				int16_t py = y + row * TEXT_SCALE;
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

void renderCharWithAccent(Canvas& canvas, char c, int16_t x, int16_t y,
                          uint8_t r, uint8_t g, uint8_t b,
                          uint8_t accentR, uint8_t accentG, uint8_t accentB,
                          uint8_t alpha, BlendMode mode) {
	const uint8_t* glyph = getGlyph(c);
	if (glyph == nullptr) {
		return;
	}

	CRGBA mainColor(r, g, b, alpha);
	CRGBA accentColor(accentR, accentG, accentB, alpha);

	uint8_t prevRow = 0;

	// Process rows 0-8 (row 8 is edge row for shadows only, no main pixels)
	for (uint8_t row = 0; row <= FONT_CHAR_HEIGHT; row++) {
		uint8_t currRow = (row < FONT_CHAR_HEIGHT) ? pgm_read_byte(&glyph[row]) : 0;

		// Shadow source: previous row shifted right by 1 bit (1 font pixel offset)
		uint8_t shadowSource = prevRow >> 1;
		bool edgeShadow = prevRow & 0x01;

		int16_t py = y + (row * TEXT_SCALE);

		for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
			uint8_t mask = 0x80 >> col;
			int16_t px = x + (col * TEXT_SCALE);

			// Draw accent if shadow source exists AND no main pixel covers it
			if ((shadowSource & mask) && !(currRow & mask)) {
				canvas.drawRectangle(px, py, TEXT_SCALE, TEXT_SCALE, accentColor, mode);
			}

			// Draw main pixel (only for rows 0-7)
			if ((row < FONT_CHAR_HEIGHT) && (currRow & mask)) {
				canvas.drawRectangle(px, py, TEXT_SCALE, TEXT_SCALE, mainColor, mode);
			}
		}

		// Edge column 8: shadow from rightmost pixel of previous row
		if (edgeShadow) {
			int16_t px = x + (FONT_CHAR_WIDTH * TEXT_SCALE);
			canvas.drawRectangle(px, py, TEXT_SCALE, TEXT_SCALE, accentColor, mode);
		}

		prevRow = currRow;
	}
}
