#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "gradient_utils.h"

class TextEffect : public IEffect {
   private:
	static constexpr uint8_t MAX_TEXT_LENGTH = 32;

	struct TextInstance {
		char text[MAX_TEXT_LENGTH];
		uint8_t textLen;
		uint8_t r, g, b;
		uint8_t accentR, accentG, accentB;
		bool hasAccent;
		float duration;      // Duration in seconds, 0 = permanent
		float elapsedTime;   // Elapsed time in seconds
		// Gradient animation (optional)
		bool hasGradient;
		CRGB gradientLut[GRADIENT_LUT_SIZE];
		float gradientSpeed;
		float gradientScale;
		float gradientTime;
	};

	std::vector<TextInstance> instances;
	const Matrix& matrix;
	Canvas& canvas;

   public:
	TextEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
