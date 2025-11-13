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

		for (uint16_t y = 0; y < canvasHeight; y++) {
			for (uint16_t x = 0; x < canvasWidth; x++) {
				uint8_t segment = x / segmentWidth;
				if (segment > 3)
					segment = 3;

				uint32_t color;
				switch (segment) {
					case 0:
						color = RGBA(255, 0, 0, 255);
						break;  // Red
					case 1:
						color = RGBA(0, 255, 0, 255);
						break;  // Green
					case 2:
						color = RGBA(0, 0, 255, 255);
						break;  // Blue
					case 3:
						color = RGBA(255, 255, 0, 255);
						break;  // Yellow
					default:
						color = RGBA(255, 255, 0, 255);
						break;
				}

				canvas.setPixel(x, y, color);
			}
		}
	}
	// Matrix layout: 4 quadrants (TL=Red, TR=Green, BL=Blue, BR=Yellow)
	else {
		uint16_t midX = canvasWidth / 2;
		uint16_t midY = canvasHeight / 2;

		for (uint16_t y = 0; y < canvasHeight; y++) {
			for (uint16_t x = 0; x < canvasWidth; x++) {
				uint32_t color;
				if (y < midY) {
					color = (x < midX) ? RGBA(255, 0, 0, 255) : RGBA(0, 255, 0, 255);
				} else {
					color = (x < midX) ? RGBA(0, 0, 255, 255) : RGBA(255, 255, 0, 255);
				}
				canvas.setPixel(x, y, color);
			}
		}
	}
}

void TestLedsEffect::reset() {
	// Clear the canvas when test mode is disabled
	canvas.clear();
}

Canvas& TestLedsEffect::getCanvas() {
	return canvas;
}