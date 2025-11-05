#pragma once

#include <FastLED.h>
#include <vector>
#include "matrix.h"

class PulseEffect {
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
	void update(float deltaTime); // Update all pulses, remove completed ones (deltaTime in seconds)
	void render(Matrix& matrix);  // Render all pulses to virtual display
};
