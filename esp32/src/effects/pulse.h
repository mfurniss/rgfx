#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "utils/easing.h"

class PulseEffect : public IEffect {
   private:
	enum class CollapseMode { Horizontal, Vertical, None };

	struct Pulse {
		EasingFunction easing; // Easing function (maps 0-1 to 0-1)
		float duration;        // Total duration in seconds
		float elapsedTime;     // Elapsed time in seconds (float for precision)
		uint8_t r, g, b;       // RGB color
		bool fade;             // Whether to fade out (true) or stay full brightness (false)
		CollapseMode collapse; // Shrink direction: horizontal (top/bottom), vertical (left/right), none

		// Calculate progress (0.0 to 1.0)
		float progress() const {
			return elapsedTime / duration;
		}

		// Calculate remaining duration in seconds (for sorting)
		float remaining() const {
			return duration - elapsedTime;
		}
	};

	std::vector<Pulse> pulses;  // Dynamic array of active pulses
	const Matrix& matrix;
	Canvas& canvas;

   public:
	PulseEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
