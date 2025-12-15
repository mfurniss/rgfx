#pragma once

#include "graphics/canvas.h"
#include "fonts/den_8x8.h"

// Character dimensions at 4x scale
constexpr uint8_t TEXT_SCALE = 4;
constexpr int16_t CHAR_WIDTH = FONT_CHAR_WIDTH * TEXT_SCALE;    // 32
constexpr int16_t CHAR_HEIGHT = FONT_CHAR_HEIGHT * TEXT_SCALE;  // 32

void renderChar(Canvas& canvas, char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b);
