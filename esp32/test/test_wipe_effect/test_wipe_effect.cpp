#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <vector>

#include "canvas.h"
#include "canvas.cpp"

uint32_t parseColor(const char* colorHex) {
	if (colorHex[0] == '#') {
		colorHex++;
	}
	return (uint32_t)strtol(colorHex, NULL, 16);
}

struct Matrix {
	uint16_t width;
	uint16_t height;
	Matrix(uint16_t w, uint16_t h) : width(w), height(h) {}
};

class IEffect {
   public:
	virtual ~IEffect() = default;
	virtual void add(JsonDocument& props) = 0;
	virtual void update(float deltaTime) = 0;
	virtual void render() = 0;
	virtual void reset() = 0;
	virtual Canvas& getCanvas() = 0;
};

class WipeEffect : public IEffect {
   private:
	struct Wipe {
		uint8_t r, g, b;
		uint32_t duration;
		uint32_t elapsedTime;

		uint16_t currentColumn(uint16_t canvasWidth) const {
			float progress = static_cast<float>(elapsedTime) / duration;
			return static_cast<uint16_t>(progress * canvasWidth);
		}

		uint32_t remaining() const { return duration - elapsedTime; }
	};

	std::vector<Wipe> wipes;
	Canvas canvas;

   public:
	WipeEffect(const Matrix& matrix);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	Canvas& getCanvas() override;
};

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 100;

WipeEffect::WipeEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4) {}

void WipeEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;

	Wipe newWipe;
	newWipe.r = (color >> 16) & 0xFF;
	newWipe.g = (color >> 8) & 0xFF;
	newWipe.b = color & 0xFF;
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	wipes.push_back(newWipe);
}

void WipeEffect::update(float deltaTime) {
	canvas.clear();

	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	for (auto it = wipes.begin(); it != wipes.end();) {
		it->elapsedTime += deltaTimeMs;
		if (it->elapsedTime >= it->duration) {
			it = wipes.erase(it);
		} else {
			++it;
		}
	}
}

void WipeEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	for (const auto& wipe : wipes) {
		uint16_t column = wipe.currentColumn(width);
		uint32_t rgba = RGBA(wipe.r, wipe.g, wipe.b, 255);

		for (uint16_t x = column; x <= column + (width * 0.1); x++) {
			for (uint16_t y = 0; y < height; y++) {
				canvas.setPixel(x, y, rgba);
			}
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}

Canvas& WipeEffect::getCanvas() {
	return canvas;
}

void setUp(void) {}

void tearDown(void) {}

void test_wipe_creation_default_values() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	effect.add(props);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_TRUE(hasPixel);
}

void test_wipe_creation_with_color() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	effect.add(props);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasRed = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			uint32_t pixel = canvas.getPixel(x, y);
			if (RGBA_RED(pixel) > 200 && RGBA_GREEN(pixel) == 0 && RGBA_BLUE(pixel) == 0) {
				hasRed = true;
				break;
			}
		}
		if (hasRed) break;
	}

	TEST_ASSERT_TRUE(hasRed);
}

void test_wipe_progresses_over_time() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 2000;
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasGreen1 = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (RGBA_GREEN(canvas.getPixel(x, y)) > 200) {
				hasGreen1 = true;
				break;
			}
		}
		if (hasGreen1) break;
	}

	effect.update(0.5f);
	effect.render();

	bool hasGreen2 = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (RGBA_GREEN(canvas.getPixel(x, y)) > 200) {
				hasGreen2 = true;
				break;
			}
		}
		if (hasGreen2) break;
	}

	TEST_ASSERT_TRUE(hasGreen1);
	TEST_ASSERT_TRUE(hasGreen2);
}

void test_wipe_completes() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	effect.add(props);

	effect.update(1.0f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_FALSE(hasPixel);
}

void test_wipe_reset_clears_all() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	effect.add(props);

	effect.reset();
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasPixel = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixel = true;
				break;
			}
		}
		if (hasPixel) break;
	}

	TEST_ASSERT_FALSE(hasPixel);
}

void test_wipe_canvas_size_matches_matrix() {
	Matrix mockMatrix(8, 8);
	WipeEffect effect(mockMatrix);

	Canvas& canvas = effect.getCanvas();

	TEST_ASSERT_EQUAL(32, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
}

void test_wipe_column_calculation() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["duration"] = 1000;
	effect.add(props);

	effect.update(0.1f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	bool hasPixelInFirstHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth() / 2; x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixelInFirstHalf = true;
				break;
			}
		}
		if (hasPixelInFirstHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInFirstHalf);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_wipe_creation_default_values);
	RUN_TEST(test_wipe_creation_with_color);
	RUN_TEST(test_wipe_progresses_over_time);
	RUN_TEST(test_wipe_completes);
	RUN_TEST(test_wipe_reset_clears_all);
	RUN_TEST(test_wipe_canvas_size_matches_matrix);
	RUN_TEST(test_wipe_column_calculation);
	return UNITY_END();
}
