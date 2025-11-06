#include "pulse.h"
#include "matrix.h"
#include <FastLED.h>
#include <algorithm>

PulseEffect::PulseEffect() {}

void PulseEffect::addPulse(CRGB color, uint32_t duration, bool fade) {
	Pulse newPulse;
	newPulse.color = color;
	newPulse.alpha = 255;
	newPulse.duration = duration;
	newPulse.fade = fade;
	newPulse.elapsedTime = fade ? 0 : 0;  // Only meaningful for non-fading pulses
	pulses.push_back(newPulse);
}

void PulseEffect::update(float deltaTime) {
	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	// Iterate through all pulses and update their alpha values
	for (auto it = pulses.begin(); it != pulses.end();) {
		if (it->fade) {
			// Fading pulse: calculate fade delta based on uint8_t alpha (0-255)
			// fadeDelta = (deltaTime in ms / duration in ms) * 255
			float fadeDelta = (deltaTimeMs * 255.0f) / it->duration;

			// Decrement alpha (uint8_t will clamp at 0)
			if (fadeDelta >= it->alpha) {
				it = pulses.erase(it);
			} else {
				it->alpha -= static_cast<uint8_t>(fadeDelta);
				++it;
			}
		} else {
			// Non-fading pulse: keep alpha at 255, remove when duration expires
			it->elapsedTime += deltaTimeMs;
			if (it->elapsedTime >= it->duration) {
				it = pulses.erase(it);
			} else {
				++it;
			}
		}
	}
}

void PulseEffect::render(Matrix& matrix) {
	// Sort pulses by remaining duration (lowest first, highest rendered last)
	std::sort(pulses.begin(), pulses.end(),
		[](const Pulse& a, const Pulse& b) {
			return a.remaining() < b.remaining();
		});

	// Render in sorted order - last pulse overwrites
	for (const auto& pulse : pulses) {
		CRGB pulseColor = pulse.color;
		pulseColor.nscale8_video(pulse.alpha);

		for (uint32_t i = 0; i < matrix.size; i++) {
			matrix.leds[i] = blend(matrix.leds[i], pulseColor, pulse.alpha);
		}
	}
}

void PulseEffect::reset() {
	pulses.clear();
}
