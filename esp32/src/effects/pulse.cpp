#include "pulse.h"
#include "matrix.h"
#include <FastLED.h>

PulseEffect::PulseEffect() {}

void PulseEffect::addPulse(CRGB color, uint32_t duration) {
	Pulse newPulse;
	newPulse.color = color;
	newPulse.alpha = 1.0f;
	newPulse.duration = duration;
	pulses.push_back(newPulse);
}

void PulseEffect::update(float deltaTime) {
	// Iterate through all pulses and update their alpha values
	for (auto it = pulses.begin(); it != pulses.end();) {
		// Calculate fade delta: how much alpha decreases this frame
		// deltaTime is in seconds, duration is in milliseconds
		// fadeDelta = (deltaTime in seconds) / (duration in seconds)
		float fadeDelta = (deltaTime * 1000.0f) / it->duration;

		// Decrement alpha
		it->alpha -= fadeDelta;

		// Remove pulse if alpha has reached zero or below
		if (it->alpha <= 0.0f) {
			it = pulses.erase(it);
		} else {
			++it;
		}
	}
}

void PulseEffect::render(Matrix& matrix) {
	// Render all active pulses with additive blending
	for (const auto& pulse : pulses) {
		// Scale color by alpha
		CRGB scaledColor = pulse.color;
		scaledColor.nscale8_video(static_cast<uint8_t>(pulse.alpha * 255.0f));

		// Additive blend onto all LEDs
		for (uint32_t i = 0; i < matrix.size; i++) {
			matrix.leds[i] += scaledColor;
		}
	}
}
