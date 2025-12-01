#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <algorithm>

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

class PulseEffect : public IEffect {
   private:
	enum class CollapseMode { Horizontal, Vertical, None };

	struct Pulse {
		uint8_t r, g, b;
		uint8_t alpha;
		uint32_t duration;
		uint32_t elapsedTime;
		bool fade;
		CollapseMode collapse;

		uint32_t remaining() const {
			return fade ?
				((static_cast<uint32_t>(alpha) * duration) / 255) :
				(duration - elapsedTime);
		}
	};

	std::vector<Pulse> pulses;
	Canvas canvas;

   public:
	PulseEffect(const Matrix& matrix);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	Canvas& getCanvas() override;
};

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 1000;
static const bool DEFAULT_FADE = true;

PulseEffect::PulseEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4) {}

void PulseEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;
	bool fade = props["fade"].is<bool>() ? props["fade"].as<bool>() : DEFAULT_FADE;
	const char* collapseStr = props["collapse"] | "horizontal";

	CollapseMode collapse = CollapseMode::Horizontal;
	if (strcmp(collapseStr, "vertical") == 0) {
		collapse = CollapseMode::Vertical;
	} else if (strcmp(collapseStr, "none") == 0) {
		collapse = CollapseMode::None;
	}

	Pulse newPulse;
	newPulse.r = (color >> 16) & 0xFF;
	newPulse.g = (color >> 8) & 0xFF;
	newPulse.b = color & 0xFF;
	newPulse.alpha = 255;
	newPulse.duration = duration;
	newPulse.fade = fade;
	newPulse.collapse = collapse;
	newPulse.elapsedTime = 0;
	pulses.push_back(newPulse);
}

void PulseEffect::update(float deltaTime) {
	canvas.clear();

	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	for (auto it = pulses.begin(); it != pulses.end();) {
		if (it->fade) {
			float fadeDelta = (deltaTimeMs * 255.0f) / it->duration;

			if (fadeDelta >= it->alpha) {
				it = pulses.erase(it);
			} else {
				it->alpha -= static_cast<uint8_t>(fadeDelta);
				++it;
			}
		} else {
			it->elapsedTime += deltaTimeMs;
			if (it->elapsedTime >= it->duration) {
				it = pulses.erase(it);
			} else {
				++it;
			}
		}
	}
}

void PulseEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	std::sort(pulses.begin(), pulses.end(),
		[](const Pulse& a, const Pulse& b) {
			return a.remaining() < b.remaining();
		});

	for (const auto& pulse : pulses) {
		// Calculate bounds based on collapse mode
		uint16_t startX = 0;
		uint16_t startY = 0;
		uint16_t endX = width;
		uint16_t endY = height;

		float progress = static_cast<float>(pulse.elapsedTime) / pulse.duration;
		if (progress > 1.0f) progress = 1.0f;

		if (pulse.collapse == CollapseMode::Horizontal) {
			uint16_t shrink = static_cast<uint16_t>(progress * (height / 2));
			startY = shrink;
			endY = height - shrink;
		} else if (pulse.collapse == CollapseMode::Vertical) {
			uint16_t shrink = static_cast<uint16_t>(progress * (width / 2));
			startX = shrink;
			endX = width - shrink;
		}
		// CollapseMode::None: full canvas

		for (uint16_t y = startY; y < endY; y++) {
			for (uint16_t x = startX; x < endX; x++) {
				uint32_t existing = canvas.getPixel(x, y);

				uint8_t existingR = RGBA_RED(existing);
				uint8_t existingG = RGBA_GREEN(existing);
				uint8_t existingB = RGBA_BLUE(existing);
				uint8_t existingA = RGBA_ALPHA(existing);

				uint8_t newR = ((existingR * (255 - pulse.alpha)) + (pulse.r * pulse.alpha)) / 255;
				uint8_t newG = ((existingG * (255 - pulse.alpha)) + (pulse.g * pulse.alpha)) / 255;
				uint8_t newB = ((existingB * (255 - pulse.alpha)) + (pulse.b * pulse.alpha)) / 255;
				uint8_t newA = existingA + pulse.alpha - ((existingA * pulse.alpha) / 255);

				canvas.drawPixel(x, y, RGBA(newR, newG, newB, newA));
			}
		}
	}
}

void PulseEffect::reset() {
	pulses.clear();
}

Canvas& PulseEffect::getCanvas() {
	return canvas;
}

void setUp(void) {}

void tearDown(void) {}

void test_pulse_creation_default_values() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	effect.add(props);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_ALPHA(pixel));
}

void test_pulse_creation_with_color() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	effect.add(props);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_ALPHA(pixel));
}

void test_pulse_fade_over_time() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);
	uint8_t alpha1 = RGBA_ALPHA(pixel);

	TEST_ASSERT_LESS_THAN(255, alpha1);

	effect.update(0.5f);
	effect.render();
	pixel = canvas.getPixel(0, 0);
	uint8_t alpha2 = RGBA_ALPHA(pixel);

	TEST_ASSERT_LESS_THAN(alpha1, alpha2);
}

void test_pulse_fade_completes() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	effect.add(props);

	effect.update(1.0f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_ALPHA(pixel));
}

void test_pulse_non_fading_stays_full_brightness() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 2000;
	props["fade"] = false;
	props["collapse"] = "none";  // Don't collapse so pixel (0,0) is filled
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_ALPHA(pixel));
}

void test_pulse_non_fading_expires() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#00FF00";
	props["duration"] = 1000;
	props["fade"] = false;
	effect.add(props);

	effect.update(1.0f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_ALPHA(pixel));
}

void test_pulse_multiple_pulses_exist() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props1;
	props1["color"] = "#FF0000";
	props1["fade"] = false;
	effect.add(props1);

	JsonDocument props2;
	props2["color"] = "#0000FF";
	props2["fade"] = false;
	effect.add(props2);

	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_NOT_EQUAL_UINT32(RGBA(0, 0, 0, 0), pixel);
}

void test_pulse_reset_clears_all() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	effect.add(props);

	effect.reset();
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);

	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_GREEN(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_BLUE(pixel));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_ALPHA(pixel));
}

void test_pulse_canvas_size_matches_matrix() {
	Matrix mockMatrix(8, 8);
	PulseEffect effect(mockMatrix);

	Canvas& canvas = effect.getCanvas();

	TEST_ASSERT_EQUAL(32, canvas.getWidth());
	TEST_ASSERT_EQUAL(32, canvas.getHeight());
}

void test_pulse_alpha_calculation() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = true;
	effect.add(props);

	effect.update(0.25f);
	effect.render();

	Canvas& canvas = effect.getCanvas();
	uint32_t pixel = canvas.getPixel(0, 0);
	uint8_t alpha = RGBA_ALPHA(pixel);

	uint8_t expectedAlpha = 255 - (uint8_t)((0.25f * 1000.0f * 255.0f) / 1000.0f);
	TEST_ASSERT_UINT8_WITHIN(2, expectedAlpha, alpha);
}

void test_pulse_collapse_none_fills_canvas() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "none";
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// All corners should be filled
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(0, 0)));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(15, 0)));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(0, 15)));
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(15, 15)));
}

void test_pulse_collapse_horizontal_shrinks_height() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "horizontal";
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// Center should be filled
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(8, 8)));

	// Top and bottom edges should be empty (shrunk)
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(canvas.getPixel(8, 0)));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(canvas.getPixel(8, 15)));
}

void test_pulse_collapse_vertical_shrinks_width() {
	Matrix mockMatrix(4, 4);
	PulseEffect effect(mockMatrix);

	JsonDocument props;
	props["color"] = "#FF0000";
	props["duration"] = 1000;
	props["fade"] = false;
	props["collapse"] = "vertical";
	effect.add(props);

	effect.update(0.5f);
	effect.render();

	Canvas& canvas = effect.getCanvas();

	// Center should be filled
	TEST_ASSERT_EQUAL_UINT8(255, RGBA_RED(canvas.getPixel(8, 8)));

	// Left and right edges should be empty (shrunk)
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(canvas.getPixel(0, 8)));
	TEST_ASSERT_EQUAL_UINT8(0, RGBA_RED(canvas.getPixel(15, 8)));
}

int main(int argc, char** argv) {
	UNITY_BEGIN();
	RUN_TEST(test_pulse_creation_default_values);
	RUN_TEST(test_pulse_creation_with_color);
	RUN_TEST(test_pulse_fade_over_time);
	RUN_TEST(test_pulse_fade_completes);
	RUN_TEST(test_pulse_non_fading_stays_full_brightness);
	RUN_TEST(test_pulse_non_fading_expires);
	RUN_TEST(test_pulse_multiple_pulses_exist);
	RUN_TEST(test_pulse_reset_clears_all);
	RUN_TEST(test_pulse_canvas_size_matches_matrix);
	RUN_TEST(test_pulse_alpha_calculation);
	RUN_TEST(test_pulse_collapse_none_fills_canvas);
	RUN_TEST(test_pulse_collapse_horizontal_shrinks_height);
	RUN_TEST(test_pulse_collapse_vertical_shrinks_width);
	return UNITY_END();
}
