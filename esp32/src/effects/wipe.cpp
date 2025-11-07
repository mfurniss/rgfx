#include "wipe.h"
#include "matrix.h"
#include <FastLED.h>
#include <algorithm>

WipeEffect::WipeEffect() {}

void WipeEffect::addWipe(CRGB color, uint32_t duration, bool fade) {
	Wipe newWipe;
	newWipe.color = color;
	newWipe.alpha = 255;
	newWipe.duration = duration;
	newWipe.fade = fade;
	newWipe.elapsedTime = fade ? 0 : 0;  // Only meaningful for non-fading wipes
	wipes.push_back(newWipe);
}

void WipeEffect::update(float deltaTime) {
	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	// Iterate through all wipes and update their alpha values
	for (auto it = wipes.begin(); it != wipes.end();) {
		if (it->fade) {
			// Fading wipe: calculate fade delta based on uint8_t alpha (0-255)
			// fadeDelta = (deltaTime in ms / duration in ms) * 255
			float fadeDelta = (deltaTimeMs * 255.0f) / it->duration;

			// Decrement alpha (uint8_t will clamp at 0)
			if (fadeDelta >= it->alpha) {
				it = wipes.erase(it);
			} else {
				it->alpha -= static_cast<uint8_t>(fadeDelta);
				++it;
			}
		} else {
			// Non-fading wipe: keep alpha at 255, remove when duration expires
			it->elapsedTime += deltaTimeMs;
			if (it->elapsedTime >= it->duration) {
				it = wipes.erase(it);
			} else {
				++it;
			}
		}
	}
}

void WipeEffect::render(Matrix& matrix) {
	// Sort wipes by remaining duration (lowest first, highest rendered last)
	std::sort(wipes.begin(), wipes.end(),
		[](const Wipe& a, const Wipe& b) {
			return a.remaining() < b.remaining();
		});

	// Render in sorted order - last wipe overwrites
	for (const auto& wipe : wipes) {
		CRGB wipeColor = wipe.color;
		wipeColor.nscale8_video(wipe.alpha);

		for (uint32_t i = 0; i < matrix.size; i++) {
			matrix.leds[i] = blend(matrix.leds[i], wipeColor, wipe.alpha);
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}
