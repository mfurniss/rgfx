#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

enum class TextAlign : uint8_t {
	LEFT = 0,
	CENTER = 1,
	RIGHT = 2
};

class TextEffect : public IEffect {
   private:
	static constexpr uint8_t MAX_TEXT_LENGTH = 32;

	struct TextInstance {
		char text[MAX_TEXT_LENGTH];
		uint8_t textLen;
		uint8_t r, g, b;
		uint8_t accentR, accentG, accentB;
		bool hasAccent;
		int16_t x, y;        // Position in canvas coords (top-left of first char)
		TextAlign align;     // Horizontal alignment
		float duration;      // Duration in seconds, 0 = permanent
		float elapsedTime;   // Elapsed time in seconds
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
