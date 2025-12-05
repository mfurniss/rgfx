#pragma once
#include <stdint.h>

// Coordinate transform function type
typedef uint16_t (*CoordinateTransform)(uint16_t x, uint16_t y, uint16_t width, uint16_t height);

// Build coordinate lookup table for given layout (single panel)
uint16_t* buildCoordinateMap(uint16_t width, uint16_t height, const char* layout);

// Build coordinate lookup table for unified multi-panel display
// panelOrder is a flat array of panel chain indices in row-major order
uint16_t* buildUnifiedCoordinateMap(
    uint16_t panelWidth, uint16_t panelHeight,
    uint8_t unifiedCols, uint8_t unifiedRows,
    const uint8_t* panelOrder,
    const char* layout
);
