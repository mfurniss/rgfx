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
}

void TestLedsEffect::reset() {}