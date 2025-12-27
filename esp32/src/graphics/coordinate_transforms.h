#pragma once
#include <stdint.h>

// Coordinate transform function type
typedef uint16_t (*CoordinateTransform)(uint16_t x, uint16_t y, uint16_t width, uint16_t height);

// Build coordinate lookup table for given layout (single panel)
// reverse: if true, flip LED indices so index 0 maps to last physical LED (strips only)
uint16_t* buildCoordinateMap(uint16_t width, uint16_t height, const char* layout, bool reverse = false);

// Build coordinate lookup table for unified multi-panel display
// panelOrder is a flat array of panel chain indices in row-major order
// panelRotation is a flat array of rotation values (0=0°, 1=90°, 2=180°, 3=270°)
uint16_t* buildUnifiedCoordinateMap(
    uint16_t panelWidth, uint16_t panelHeight,
    uint8_t unifiedCols, uint8_t unifiedRows,
    const uint8_t* panelOrder,
    const uint8_t* panelRotation,
    const char* layout
);
