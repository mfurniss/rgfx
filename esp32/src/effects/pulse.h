#pragma once

#include <FastLED.h>
#include <vector>
#include "effect.h"
#include "matrix.h"

class PulseEffect : public IEffect {
  private:
	struct Pulse {
		CRGB color;        // RGB color
		float alpha;       // Alpha channel: 1.0 (full) → 0.0 (transparent)
		uint32_t duration; // Total duration in milliseconds
	};

	std::vector<Pulse> pulses; // Dynamic array of active pulses

  public:
	PulseEffect();
	void addPulse(CRGB color, uint32_t duration);
	void update(float deltaTime) override; // Update all pulses, remove completed ones (deltaTime in seconds)
	void render(Matrix& matrix) override;  // Render all pulses to virtual display
	void reset() override;                 // Remove all active pulses
};
