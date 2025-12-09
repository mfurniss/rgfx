#include "test_leds.h"
#include "graphics/canvas.h"
#include <FastLED.h>

TestLedsEffect::TestLedsEffect(const Matrix& m, Canvas& c) : canvas(c), matrix(m) {}

void TestLedsEffect::add(JsonDocument& props) {
	(void)props;
}

void TestLedsEffect::update(float deltaTime) {
	(void)deltaTime;
}

void TestLedsEffect::render() {

	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	// Strip layout: 25% segments (Red, Green, Blue, Yellow)
	if (matrix.layoutType == LayoutType::STRIP) {
		uint16_t segmentWidth = canvasWidth / 4;

		canvas.drawRectangle(0, 0, segmentWidth, canvasHeight, CRGB(255, 0, 0));
		canvas.drawRectangle(segmentWidth, 0, segmentWidth, canvasHeight, CRGB(0, 255, 0));
		canvas.drawRectangle(segmentWidth * 2, 0, segmentWidth, canvasHeight, CRGB(0, 0, 255));
		canvas.drawRectangle(segmentWidth * 3, 0, segmentWidth, canvasHeight, CRGB(255, 255, 0));
	}
	// Matrix layout: 4 quadrants (TL=Red, TR=Green, BL=Blue, BR=Yellow)
	else {
		uint16_t midX = canvasWidth / 2;
		uint16_t midY = canvasHeight / 2;

		canvas.drawRectangle(0, 0, midX, midY, CRGB(255, 0, 0));      // Top-Left: Red
		canvas.drawRectangle(midX, 0, midX, midY, CRGB(0, 255, 0));   // Top-Right: Green
		canvas.drawRectangle(0, midY, midX, midY, CRGB(0, 0, 255));   // Bottom-Left: Blue
		canvas.drawRectangle(midX, midY, midX, midY, CRGB(255, 255, 0));  // Bottom-Right: Yellow
	}

	// White orientation marker at top-left of each logical panel cell
	// Canvas is 4x the matrix size, so draw a 4x4 block to map to one LED after downsampling
	// Use logical cell dimensions (width/cols, height/rows) not physical panel dimensions,
	// since panel rotations can swap effective dimensions
	uint8_t cols = matrix.getUnifiedCols();
	uint8_t rows = matrix.getUnifiedRows();
	uint16_t cellWidth = (cols > 1) ? (matrix.width / cols) : matrix.width;
	uint16_t cellHeight = (rows > 1) ? (matrix.height / rows) : matrix.height;
	uint16_t pWidth = cellWidth * 4;
	uint16_t pHeight = (matrix.layoutType == LayoutType::STRIP) ? 1 : cellHeight * 4;

	for (uint8_t row = 0; row < rows; row++) {
		for (uint8_t col = 0; col < cols; col++) {
			uint16_t x = col * pWidth;
			uint16_t y = row * pHeight;
			// Draw 4x4 block (or 4x1 for strips) to ensure it maps to exactly one LED
			uint16_t markerHeight = (matrix.layoutType == LayoutType::STRIP) ? 1 : 4;
			canvas.drawRectangle(x, y, 4, markerHeight, CRGB(255, 255, 255));
		}
	}
}

void TestLedsEffect::reset() {}