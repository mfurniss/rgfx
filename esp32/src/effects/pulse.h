#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "canvas.h"

class PulseEffect : public IEffect {
   private:
	struct Pulse {
		uint8_t r, g, b;       // RGB color
		uint8_t alpha;         // Alpha channel: 255 (full) → 0 (transparent)
		uint32_t duration;     // Total duration in milliseconds
		uint32_t elapsedTime;  // Elapsed time in milliseconds (only used for non-fading pulses)
		bool fade;             // Whether to fade out (true) or stay full brightness (false)

		// Calculate remaining duration
		uint32_t remaining() const {
			return fade ?
				((static_cast<uint32_t>(alpha) * duration) / 255) :
				(duration - elapsedTime);
		}
	};

	std::vector<Pulse> pulses;  // Dynamic array of active pulses
	Canvas canvas;

   public:
	PulseEffect(const Matrix& matrix);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	Canvas& getCanvas() override;
};
