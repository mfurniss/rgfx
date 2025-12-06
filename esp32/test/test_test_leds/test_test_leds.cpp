/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>

#include "canvas.h"
#include "canvas.cpp"

enum class LayoutType : uint8_t {
	STRIP = 1,
	MATRIX = 2
};

// Mock Matrix with panel dimension support
struct Matrix {
	uint16_t width;
	uint16_t height;
	LayoutType layoutType;

private:
	uint16_t panelWidth_;
	uint16_t panelHeight_;
	uint8_t unifiedCols_;
	uint8_t unifiedRows_;

public:
	// Single panel constructor
	Matrix(uint16_t w, uint16_t h, LayoutType layout = LayoutType::MATRIX)
		: width(w), height(h), layoutType(layout),
		  panelWidth_(w), panelHeight_(h), unifiedCols_(1), unifiedRows_(1) {}

	// Unified panel constructor
	Matrix(uint16_t pWidth, uint16_t pHeight, uint8_t cols, uint8_t rows, LayoutType layout = LayoutType::MATRIX)
		: width(pWidth * cols), height(pHeight * rows), layoutType(layout),
		  panelWidth_(pWidth), panelHeight_(pHeight), unifiedCols_(cols), unifiedRows_(rows) {}

	uint16_t getPanelWidth() const { return panelWidth_; }
	uint16_t getPanelHeight() const { return panelHeight_; }
	uint8_t getUnifiedCols() const { return unifiedCols_; }
	uint8_t getUnifiedRows() const { return unifiedRows_; }
};

class IEffect {
public:
	virtual ~IEffect() = default;
	virtual void add(JsonDocument& props) = 0;
	virtual void update(float deltaTime) = 0;
	virtual void render() = 0;
	virtual void reset() = 0;
};

// Inline TestLedsEffect implementation for testing
class TestLedsEffect : public IEffect {
private:
	Canvas& canvas;
	const Matrix& matrix;

public:
	TestLedsEffect(const Matrix& m, Canvas& c) : canvas(c), matrix(m) {}

	void add(JsonDocument& props) override {
		(void)props;
	}

	void update(float deltaTime) override {
		(void)deltaTime;
	}

	void render() override {
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

		// White orientation marker at top-left of each physical panel
		uint16_t pWidth = matrix.getPanelWidth();
		uint16_t pHeight = matrix.getPanelHeight();
		uint8_t cols = matrix.getUnifiedCols();
		uint8_t rows = matrix.getUnifiedRows();

		for (uint8_t row = 0; row < rows; row++) {
			for (uint8_t col = 0; col < cols; col++) {
				uint16_t x = col * pWidth;
				uint16_t y = row * pHeight;
				canvas.drawPixel(x, y, CRGB(255, 255, 255));
			}
		}
	}

	void reset() override {}
};

void setUp(void) {}

void tearDown(void) {}

void test_single_panel_has_white_marker_at_origin() {
	Matrix matrix(8, 8);
	Canvas canvas(8, 8);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

void test_unified_2x2_has_white_markers_at_each_panel_origin() {
	// 2x2 grid of 8x8 panels = 16x16 total
	Matrix matrix(8, 8, 2, 2);
	Canvas canvas(16, 16);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	// Panel (0,0) - top-left at (0,0)
	CRGB p00 = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p00.r, "Panel (0,0) red");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p00.g, "Panel (0,0) green");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p00.b, "Panel (0,0) blue");

	// Panel (1,0) - top-right at (8,0)
	CRGB p10 = canvas.getPixel(8, 0);
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p10.r, "Panel (1,0) red");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p10.g, "Panel (1,0) green");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p10.b, "Panel (1,0) blue");

	// Panel (0,1) - bottom-left at (0,8)
	CRGB p01 = canvas.getPixel(0, 8);
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p01.r, "Panel (0,1) red");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p01.g, "Panel (0,1) green");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p01.b, "Panel (0,1) blue");

	// Panel (1,1) - bottom-right at (8,8)
	CRGB p11 = canvas.getPixel(8, 8);
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p11.r, "Panel (1,1) red");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p11.g, "Panel (1,1) green");
	TEST_ASSERT_EQUAL_UINT8_MESSAGE(255, p11.b, "Panel (1,1) blue");
}

void test_unified_3x1_horizontal_has_white_markers() {
	// 3x1 grid of 8x8 panels = 24x8 total
	Matrix matrix(8, 8, 3, 1);
	Canvas canvas(24, 8);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	// Panel 0 at (0,0)
	CRGB p0 = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, p0.r);
	TEST_ASSERT_EQUAL_UINT8(255, p0.g);
	TEST_ASSERT_EQUAL_UINT8(255, p0.b);

	// Panel 1 at (8,0)
	CRGB p1 = canvas.getPixel(8, 0);
	TEST_ASSERT_EQUAL_UINT8(255, p1.r);
	TEST_ASSERT_EQUAL_UINT8(255, p1.g);
	TEST_ASSERT_EQUAL_UINT8(255, p1.b);

	// Panel 2 at (16,0)
	CRGB p2 = canvas.getPixel(16, 0);
	TEST_ASSERT_EQUAL_UINT8(255, p2.r);
	TEST_ASSERT_EQUAL_UINT8(255, p2.g);
	TEST_ASSERT_EQUAL_UINT8(255, p2.b);
}

void test_strip_layout_has_white_marker_at_start() {
	Matrix matrix(32, 1, LayoutType::STRIP);
	Canvas canvas(32, 1);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	CRGB pixel = canvas.getPixel(0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.r);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.g);
	TEST_ASSERT_EQUAL_UINT8(255, pixel.b);
}

void test_matrix_quadrants_correct_colors() {
	Matrix matrix(8, 8);
	Canvas canvas(8, 8);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	// Top-left quadrant should be red (but (0,0) is white marker)
	CRGB tl = canvas.getPixel(1, 1);
	TEST_ASSERT_EQUAL_UINT8(255, tl.r);
	TEST_ASSERT_EQUAL_UINT8(0, tl.g);
	TEST_ASSERT_EQUAL_UINT8(0, tl.b);

	// Top-right quadrant should be green
	CRGB tr = canvas.getPixel(5, 1);
	TEST_ASSERT_EQUAL_UINT8(0, tr.r);
	TEST_ASSERT_EQUAL_UINT8(255, tr.g);
	TEST_ASSERT_EQUAL_UINT8(0, tr.b);

	// Bottom-left quadrant should be blue
	CRGB bl = canvas.getPixel(1, 5);
	TEST_ASSERT_EQUAL_UINT8(0, bl.r);
	TEST_ASSERT_EQUAL_UINT8(0, bl.g);
	TEST_ASSERT_EQUAL_UINT8(255, bl.b);

	// Bottom-right quadrant should be yellow
	CRGB br = canvas.getPixel(5, 5);
	TEST_ASSERT_EQUAL_UINT8(255, br.r);
	TEST_ASSERT_EQUAL_UINT8(255, br.g);
	TEST_ASSERT_EQUAL_UINT8(0, br.b);
}

void test_strip_segments_correct_colors() {
	Matrix matrix(16, 1, LayoutType::STRIP);
	Canvas canvas(16, 1);
	TestLedsEffect effect(matrix, canvas);

	effect.render();

	// Segment 0: Red (but (0,0) is white)
	CRGB s0 = canvas.getPixel(1, 0);
	TEST_ASSERT_EQUAL_UINT8(255, s0.r);
	TEST_ASSERT_EQUAL_UINT8(0, s0.g);
	TEST_ASSERT_EQUAL_UINT8(0, s0.b);

	// Segment 1: Green
	CRGB s1 = canvas.getPixel(5, 0);
	TEST_ASSERT_EQUAL_UINT8(0, s1.r);
	TEST_ASSERT_EQUAL_UINT8(255, s1.g);
	TEST_ASSERT_EQUAL_UINT8(0, s1.b);

	// Segment 2: Blue
	CRGB s2 = canvas.getPixel(9, 0);
	TEST_ASSERT_EQUAL_UINT8(0, s2.r);
	TEST_ASSERT_EQUAL_UINT8(0, s2.g);
	TEST_ASSERT_EQUAL_UINT8(255, s2.b);

	// Segment 3: Yellow
	CRGB s3 = canvas.getPixel(13, 0);
	TEST_ASSERT_EQUAL_UINT8(255, s3.r);
	TEST_ASSERT_EQUAL_UINT8(255, s3.g);
	TEST_ASSERT_EQUAL_UINT8(0, s3.b);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_single_panel_has_white_marker_at_origin);
	RUN_TEST(test_unified_2x2_has_white_markers_at_each_panel_origin);
	RUN_TEST(test_unified_3x1_horizontal_has_white_markers);
	RUN_TEST(test_strip_layout_has_white_marker_at_start);
	RUN_TEST(test_matrix_quadrants_correct_colors);
	RUN_TEST(test_strip_segments_correct_colors);
	return UNITY_END();
}
