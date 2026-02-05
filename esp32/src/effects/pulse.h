#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
#include "instance_vector.h"
#include "graphics/canvas.h"
#include "utils/easing.h"

class PulseEffect : public IEffect {
   private:
	static constexpr size_t MAX_PULSES = 64;
	enum class CollapseMode { Horizontal, Vertical, None };

	struct Pulse {
		EasingFunction easing; // Easing function (maps 0-1 to 0-1)
		float duration;        // Total duration in seconds
		float elapsedTime;     // Elapsed time in seconds (float for precision)
		RGBColor color;        // RGB color
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

	CappedVector<Pulse, MAX_PULSES> pulses;
	Canvas& canvas;

   public:
	PulseEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
