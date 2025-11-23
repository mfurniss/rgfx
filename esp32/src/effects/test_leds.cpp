#include "test_leds.h"
#include "canvas.h"

TestLedsEffect::TestLedsEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4), matrix(m) {}

void TestLedsEffect::add(JsonDocument& props) {
	(void)props;
}

void TestLedsEffect::update(float deltaTime) {
	(void)deltaTime;
}

void TestLedsEffect::render() {
	canvas.clear();

	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	// Strip layout: 25% segments (Red, Green, Blue, Yellow)
	if (matrix.layout == "strip") {
		uint16_t segmentWidth = canvasWidth / 4;

		canvas.drawRectangle(0, 0, segmentWidth, canvasHeight, RGBA(255, 0, 0, 255));
		canvas.drawRectangle(segmentWidth, 0, segmentWidth, canvasHeight, RGBA(0, 255, 0, 255));
		canvas.drawRectangle(segmentWidth * 2, 0, segmentWidth, canvasHeight, RGBA(0, 0, 255, 255));
		canvas.drawRectangle(segmentWidth * 3, 0, segmentWidth, canvasHeight, RGBA(255, 255, 0, 255));
	}
	// Matrix layout: 4 quadrants (TL=Red, TR=Green, BL=Blue, BR=Yellow)
	else {
		uint16_t midX = canvasWidth / 2;
		uint16_t midY = canvasHeight / 2;

		canvas.drawRectangle(0, 0, midX, midY, RGBA(255, 0, 0, 255));          // Top-Left: Red
		canvas.drawRectangle(midX, 0, midX, midY, RGBA(0, 255, 0, 255));       // Top-Right: Green
		canvas.drawRectangle(0, midY, midX, midY, RGBA(0, 0, 255, 255));       // Bottom-Left: Blue
		canvas.drawRectangle(midX, midY, midX, midY, RGBA(255, 255, 0, 255));  // Bottom-Right: Yellow
	}
}

void TestLedsEffect::reset() {
	// Clear the canvas when test mode is disabled
	canvas.clear();
}

Canvas& TestLedsEffect::getCanvas() {
	return canvas;
}