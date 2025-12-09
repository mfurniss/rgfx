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
    const uint8_t* panelRotation,
    const char* layout
) {
	CoordinateTransform transform = findTransform(layout);

	// For the unified display grid, we need to determine effective panel dimensions.
	// Each panel can have independent rotation, but the grid cells must be uniform size.
	// For square panels: all rotations result in same dimensions (NxN stays NxN)
	// For non-square panels: user must ensure compatible rotations for grid alignment
	//
	// We use the first panel's rotation to determine logical cell dimensions for the grid,
	// but each panel's rotation is applied independently when mapping coordinates.
	uint8_t firstRotation = panelRotation[0];
	bool dimsSwapped = (firstRotation == 1 || firstRotation == 3);
	uint16_t cellWidth = dimsSwapped ? panelHeight : panelWidth;
	uint16_t cellHeight = dimsSwapped ? panelWidth : panelHeight;

	// Calculate unified display dimensions
	uint16_t unifiedWidth = cellWidth * unifiedCols;
	uint16_t unifiedHeight = cellHeight * unifiedRows;
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
			// Which panel cell are we in?
			uint8_t panelCol = x / cellWidth;
			uint8_t panelRow = y / cellHeight;
			uint8_t panelGridIndex = panelRow * unifiedCols + panelCol;
			uint8_t panelChainIndex = panelOrder[panelGridIndex];
			uint8_t rotation = panelRotation[panelGridIndex];

			// Local coordinates within the cell
			uint16_t localX = x % cellWidth;
			uint16_t localY = y % cellHeight;

			// Apply inverse rotation to get physical coordinates within the panel
			// Each panel's rotation is independent - we map from logical cell space
			// back to physical panel space using that panel's specific rotation.
			//
			// For this panel's rotation, determine its effective dimensions:
			bool thisSwapped = (rotation == 1 || rotation == 3);
			uint16_t effW = thisSwapped ? panelHeight : panelWidth;
			uint16_t effH = thisSwapped ? panelWidth : panelHeight;

			uint16_t physicalX, physicalY;
			switch (rotation) {
				case 1:  // 90° clockwise: inverse is 270° = (y, effW-1-x)
					physicalX = localY;
					physicalY = effW - 1 - localX;
					break;
				case 2:  // 180°: inverse is 180° = (effW-1-x, effH-1-y)
					physicalX = effW - 1 - localX;
					physicalY = effH - 1 - localY;
					break;
				case 3:  // 270° clockwise: inverse is 90° = (effH-1-y, x)
					physicalX = effH - 1 - localY;
					physicalY = localX;
					break;
				default:  // 0° (no rotation)
					physicalX = localX;
					physicalY = localY;
					break;
			}

			// Get LED index within the panel using the layout transform
			uint16_t localLedIndex = transform(physicalX, physicalY, panelWidth, panelHeight);

			// Final LED index = panel's starting position + local offset
			uint16_t ledIndex = (panelChainIndex * panelLedCount) + localLedIndex;

			map[y * unifiedWidth + x] = ledIndex;
		}
	}

	return map;
}
