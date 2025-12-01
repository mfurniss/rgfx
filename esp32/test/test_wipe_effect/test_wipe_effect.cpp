#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
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

enum class WipeDirection : uint8_t { LEFT, RIGHT, UP, DOWN };

static WipeDirection parseDirection(const char* dir, bool is1D) {
	WipeDirection result;

	if (dir == nullptr || strcmp(dir, "random") == 0) {
		result = static_cast<WipeDirection>(rand() % 4);
	} else if (strcmp(dir, "left") == 0) {
		result = WipeDirection::LEFT;
	} else if (strcmp(dir, "right") == 0) {
		result = WipeDirection::RIGHT;
	} else if (strcmp(dir, "up") == 0) {
		result = WipeDirection::UP;
	} else if (strcmp(dir, "down") == 0) {
		result = WipeDirection::DOWN;
	} else {
		result = static_cast<WipeDirection>(rand() % 4);
	}

	// For 1D strips, vertical directions map to horizontal
	if (is1D) {
		if (result == WipeDirection::UP) result = WipeDirection::LEFT;
		if (result == WipeDirection::DOWN) result = WipeDirection::RIGHT;
	}

	return result;
}

class WipeEffect : public IEffect {
   private:
	struct Wipe {
		uint8_t r, g, b;
		uint32_t duration;
		uint32_t elapsedTime;
		WipeDirection direction;

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
	const char* dirStr = props["direction"] | "random";
	bool is1D = canvas.getHeight() == 1;

	Wipe newWipe;
	newWipe.r = (color >> 16) & 0xFF;
	newWipe.g = (color >> 8) & 0xFF;
	newWipe.b = color & 0xFF;
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	newWipe.direction = parseDirection(dirStr, is1D);
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
		uint32_t rgba = RGBA(wipe.r, wipe.g, wipe.b, 255);
		uint32_t halfDuration = wipe.duration / 2;
		float progress;

		if (wipe.elapsedTime < halfDuration) {
			progress = static_cast<float>(wipe.elapsedTime) / halfDuration;
		} else {
			progress = static_cast<float>(wipe.elapsedTime - halfDuration) / halfDuration;
		}

		bool filling = wipe.elapsedTime < halfDuration;

		switch (wipe.direction) {
			case WipeDirection::RIGHT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, fillWidth, height, rgba, BlendMode::AVERAGE);
				} else {
					uint16_t startX = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(startX, 0, width - startX, height, rgba, BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::LEFT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(width - fillWidth, 0, fillWidth, height, rgba, BlendMode::AVERAGE);
				} else {
					uint16_t clearWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, width - clearWidth, height, rgba, BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::DOWN: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, fillHeight, rgba, BlendMode::AVERAGE);
				} else {
					uint16_t startY = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, startY, width, height - startY, rgba, BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::UP: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, height - fillHeight, width, fillHeight, rgba, BlendMode::AVERAGE);
				} else {
					uint16_t clearHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, height - clearHeight, rgba, BlendMode::AVERAGE);
				}
				break;
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
	props["direction"] = "right";
	effect.add(props);
	effect.update(0.01f);  // Small time step to start the wipe
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
	props["direction"] = "right";
	effect.add(props);
	effect.update(0.1f);  // Time step to start the wipe
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasRed = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			uint32_t pixel = canvas.getPixel(x, y);
			// AVERAGE blend mode halves the value, so check for > 100 instead of > 200
			if (RGBA_RED(pixel) > 100 && RGBA_GREEN(pixel) == 0 && RGBA_BLUE(pixel) == 0) {
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
	props["direction"] = "right";
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	bool hasGreen1 = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			// AVERAGE blend mode halves the value, so check for > 100 instead of > 200
			if (RGBA_GREEN(canvas.getPixel(x, y)) > 100) {
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
			// AVERAGE blend mode halves the value, so check for > 100 instead of > 200
			if (RGBA_GREEN(canvas.getPixel(x, y)) > 100) {
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
	props["direction"] = "right";
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

void test_wipe_direction_left() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["direction"] = "left";
	effect.add(props);

	effect.update(0.1f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// Left wipe should have pixels in the right half of the canvas
	bool hasPixelInRightHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = canvas.getWidth() / 2; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixelInRightHalf = true;
				break;
			}
		}
		if (hasPixelInRightHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInRightHalf);
}

void test_wipe_direction_down() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["direction"] = "down";
	effect.add(props);

	effect.update(0.1f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// Down wipe should have pixels in the top half of the canvas
	bool hasPixelInTopHalf = false;
	for (uint16_t y = 0; y < canvas.getHeight() / 2; y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixelInTopHalf = true;
				break;
			}
		}
		if (hasPixelInTopHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInTopHalf);
}

void test_wipe_direction_up() {
	Matrix mockMatrix(4, 4);
	WipeEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#0000FF";
	props["duration"] = 1000;
	props["direction"] = "up";
	effect.add(props);

	effect.update(0.1f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// Up wipe should have pixels in the bottom half of the canvas
	bool hasPixelInBottomHalf = false;
	for (uint16_t y = canvas.getHeight() / 2; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (canvas.getPixel(x, y) != RGBA(0, 0, 0, 0)) {
				hasPixelInBottomHalf = true;
				break;
			}
		}
		if (hasPixelInBottomHalf) break;
	}

	TEST_ASSERT_TRUE(hasPixelInBottomHalf);
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
	RUN_TEST(test_wipe_direction_left);
	RUN_TEST(test_wipe_direction_down);
	RUN_TEST(test_wipe_direction_up);
	return UNITY_END();
}
