#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

class ScrollTextEffect : public IEffect {
   private:
	static constexpr uint8_t MAX_TEXT_LENGTH = 64;

	struct ScrollInstance {
		char text[MAX_TEXT_LENGTH];
		uint8_t textLen;
		uint8_t r, g, b;
		uint8_t accentR, accentG, accentB;
		bool hasAccent;
		int16_t y;       // Vertical position (fixed)
		float scrollX;   // Current x position (float for smooth scrolling)
		float speed;     // Scroll speed in canvas pixels per second
		bool repeat;     // Whether to restart when text exits left edge
		bool snapToLed;  // Snap to LED boundaries to reduce shimmer
	};

	std::vector<ScrollInstance> instances;
	const Matrix& matrix;
	Canvas& canvas;

   public:
	ScrollTextEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
