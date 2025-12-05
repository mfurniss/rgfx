#include "coordinate_transforms.h"
#include <cstdlib>
#include <cstring>

// Layout: "strip"
// Simple linear mapping (0, 1, 2, ...)
static uint16_t coordinateStrip(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return y * width + x;
}

// Layout: "matrix-tl-h"
// Top-Left corner, Horizontal rows, Progressive
static uint16_t coordinateMatrixTLH(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return y * width + x;
}

// Layout: "matrix-tl-h-snake"
// Top-Left corner, Horizontal rows, Serpentine
static uint16_t coordinateMatrixTLHSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return y * width + (y & 1 ? width - 1 - x : x);
}

// Layout: "matrix-tr-h"
// Top-Right corner, Horizontal rows, Progressive
static uint16_t coordinateMatrixTRH(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return y * width + (width - 1 - x);
}

// Layout: "matrix-tr-h-snake"
// Top-Right corner, Horizontal rows, Serpentine
static uint16_t coordinateMatrixTRHSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return y * width + (y & 1 ? x : width - 1 - x);
}

// Layout: "matrix-bl-h"
// Bottom-Left corner, Horizontal rows, Progressive
static uint16_t coordinateMatrixBLH(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (height - 1 - y) * width + x;
}

// Layout: "matrix-bl-h-snake"
// Bottom-Left corner, Horizontal rows, Serpentine
static uint16_t coordinateMatrixBLHSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (height - 1 - y) * width + (y & 1 ? width - 1 - x : x);
}

// Layout: "matrix-br-h"
// Bottom-Right corner, Horizontal rows, Progressive
static uint16_t coordinateMatrixBRH(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (height - 1 - y) * width + (width - 1 - x);
}

// Layout: "matrix-br-h-snake"
// Bottom-Right corner, Horizontal rows, Serpentine
static uint16_t coordinateMatrixBRHSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (height - 1 - y) * width + (y & 1 ? x : width - 1 - x);
}

// Layout: "matrix-tl-v"
// Top-Left corner, Vertical columns, Progressive
static uint16_t coordinateMatrixTLV(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return x * height + y;
}

// Layout: "matrix-tl-v-snake"
// Top-Left corner, Vertical columns, Serpentine
static uint16_t coordinateMatrixTLVSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return x * height + (x & 1 ? height - 1 - y : y);
}

// Layout: "matrix-tr-v"
// Top-Right corner, Vertical columns, Progressive
static uint16_t coordinateMatrixTRV(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (width - 1 - x) * height + y;
}

// Layout: "matrix-tr-v-snake"
// Top-Right corner, Vertical columns, Serpentine
static uint16_t coordinateMatrixTRVSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (width - 1 - x) * height + (x & 1 ? height - 1 - y : y);
}

// Layout: "matrix-bl-v"
// Bottom-Left corner, Vertical columns, Progressive
static uint16_t coordinateMatrixBLV(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return x * height + (height - 1 - y);
}

// Layout: "matrix-bl-v-snake"
// Bottom-Left corner, Vertical columns, Serpentine
static uint16_t coordinateMatrixBLVSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return x * height + (x & 1 ? y : height - 1 - y);
}

// Layout: "matrix-br-v"
// Bottom-Right corner, Vertical columns, Progressive
static uint16_t coordinateMatrixBRV(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (width - 1 - x) * height + (height - 1 - y);
}

// Layout: "matrix-br-v-snake"
// Bottom-Right corner, Vertical columns, Serpentine
static uint16_t coordinateMatrixBRVSnake(uint16_t x, uint16_t y, uint16_t width, uint16_t height) {
	return (width - 1 - x) * height + (x & 1 ? y : height - 1 - y);
}

// Layout transform lookup table entry
struct LayoutTransform {
	const char* layout;
	CoordinateTransform transform;
};

// Lookup table mapping layout strings to transform functions
static const LayoutTransform layoutLookupTable[] = {
	{"strip", coordinateStrip},
	{"matrix-tl-h", coordinateMatrixTLH},
	{"matrix-tl-h-snake", coordinateMatrixTLHSnake},
	{"matrix-tr-h", coordinateMatrixTRH},
	{"matrix-tr-h-snake", coordinateMatrixTRHSnake},
	{"matrix-bl-h", coordinateMatrixBLH},
	{"matrix-bl-h-snake", coordinateMatrixBLHSnake},
	{"matrix-br-h", coordinateMatrixBRH},
	{"matrix-br-h-snake", coordinateMatrixBRHSnake},
	{"matrix-tl-v", coordinateMatrixTLV},
	{"matrix-tl-v-snake", coordinateMatrixTLVSnake},
	{"matrix-tr-v", coordinateMatrixTRV},
	{"matrix-tr-v-snake", coordinateMatrixTRVSnake},
	{"matrix-bl-v", coordinateMatrixBLV},
	{"matrix-bl-v-snake", coordinateMatrixBLVSnake},
	{"matrix-br-v", coordinateMatrixBRV},
	{"matrix-br-v-snake", coordinateMatrixBRVSnake},
};

// Find transform function for a layout string
static CoordinateTransform findTransform(const char* layout) {
	for (const auto& entry : layoutLookupTable) {
		if (strcmp(layout, entry.layout) == 0) {
			return entry.transform;
		}
	}
	return coordinateStrip;  // Default fallback
}

// Build coordinate lookup table using selected transform function
uint16_t* buildCoordinateMap(uint16_t width, uint16_t height, const char* layout) {
	CoordinateTransform transform = findTransform(layout);

	// Build coordinate map
	uint16_t size = width * height;
	uint16_t* map = (uint16_t*)malloc(size * sizeof(uint16_t));
	if (!map) {
		return nullptr;
	}

	for (uint16_t y = 0; y < height; y++) {
		for (uint16_t x = 0; x < width; x++) {
			map[y * width + x] = transform(x, y, width, height);
		}
	}

	return map;
}

// Build coordinate lookup table for unified multi-panel display
uint16_t* buildUnifiedCoordinateMap(
    uint16_t panelWidth, uint16_t panelHeight,
    uint8_t unifiedCols, uint8_t unifiedRows,
    const uint8_t* panelOrder,
    const char* layout
) {
	CoordinateTransform transform = findTransform(layout);

	// Calculate unified display dimensions
	uint16_t unifiedWidth = panelWidth * unifiedCols;
	uint16_t unifiedHeight = panelHeight * unifiedRows;
	uint32_t unifiedSize = (uint32_t)unifiedWidth * unifiedHeight;
	uint16_t panelLedCount = panelWidth * panelHeight;

	// Allocate coordinate map
	uint16_t* map = (uint16_t*)malloc(unifiedSize * sizeof(uint16_t));
	if (!map) {
		return nullptr;
	}

	// For each pixel in the unified display
	for (uint16_t y = 0; y < unifiedHeight; y++) {
		for (uint16_t x = 0; x < unifiedWidth; x++) {
			// Which panel are we on?
			uint8_t panelCol = x / panelWidth;
			uint8_t panelRow = y / panelHeight;
			uint8_t panelChainIndex = panelOrder[panelRow * unifiedCols + panelCol];

			// Where within that panel?
			uint16_t localX = x % panelWidth;
			uint16_t localY = y % panelHeight;

			// Get LED index within the panel using the layout transform
			uint16_t localLedIndex = transform(localX, localY, panelWidth, panelHeight);

			// Final LED index = panel's starting position + local offset
			uint16_t ledIndex = (panelChainIndex * panelLedCount) + localLedIndex;

			map[y * unifiedWidth + x] = ledIndex;
		}
	}

	return map;
}
