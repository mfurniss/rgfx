#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "gradient_utils.h"

class ScrollTextEffect : public IEffect {
   private:
	static constexpr uint16_t MAX_TEXT_LENGTH = 256;

	struct ScrollInstance {
		char text[MAX_TEXT_LENGTH];
		uint8_t textLen;
		uint8_t r, g, b;
		uint8_t accentR, accentG, accentB;
		bool hasAccent;
		float scrollX;   // Current x position (float for smooth scrolling)
		float speed;     // Scroll speed in canvas pixels per second
		bool repeat;     // Whether to restart when text exits left edge
		bool snapToLed;  // Snap to LED boundaries to reduce shimmer
		// Gradient animation (optional)
		bool hasGradient;
		CRGB gradientLut[GRADIENT_LUT_SIZE];
		float gradientSpeed;
		float gradientScale;
		float gradientTime;
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
