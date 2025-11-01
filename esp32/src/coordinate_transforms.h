#pragma once
#include <stdint.h>

// Coordinate transform function type
typedef uint16_t (*CoordinateTransform)(uint16_t x, uint16_t y, uint16_t width, uint16_t height);

// Build coordinate lookup table for given layout
uint16_t* buildCoordinateMap(uint16_t width, uint16_t height, const char* layout);
