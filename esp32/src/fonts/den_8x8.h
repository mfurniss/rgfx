/**
 * DEN 8x8 bitmap font
 * Created by denzel5310
 * https://www.fontstruct.com/fontstructions/show/2784534
 * Licensed under CC0 Public Domain Dedication
 */

#pragma once

#include <stdint.h>
#ifdef ARDUINO
#include <pgmspace.h>
#else
#define PROGMEM
#define pgm_read_byte(addr) (*(const uint8_t*)(addr))
#endif

constexpr uint8_t FONT_CHAR_WIDTH = 8;
constexpr uint8_t FONT_CHAR_HEIGHT = 7;

// Returns pointer to 7 bytes of glyph data, or nullptr if char not in font
const uint8_t* getGlyph(char c);
