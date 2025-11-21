#include "pulse.h"
#include "effect_utils.h"
#include "canvas.h"
#include <algorithm>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 1000;
static const bool DEFAULT_FADE = true;

PulseEffect::PulseEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4) {}

void PulseEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;
	bool fade = props["fade"].is<bool>() ? props["fade"].as<bool>() : DEFAULT_FADE;

	Pulse newPulse;
	newPulse.r = (color >> 16) & 0xFF;
	newPulse.g = (color >> 8) & 0xFF;
	newPulse.b = color & 0xFF;
	newPulse.alpha = 255;
	newPulse.duration = duration;
	newPulse.fade = fade;
	newPulse.elapsedTime = 0;
	pulses.push_back(newPulse);
}

void PulseEffect::update(float deltaTime) {
	canvas.clear();

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

void PulseEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Sort pulses by remaining duration (lowest first, highest rendered last)
	std::sort(pulses.begin(), pulses.end(),
		[](const Pulse& a, const Pulse& b) {
			return a.remaining() < b.remaining();
		});

	// Render pulses to canvas
	for (const auto& pulse : pulses) {
		for (uint16_t y = 0; y < height; y++) {
			for (uint16_t x = 0; x < width; x++) {
				canvas.setPixel(
					x, y, RGBA(pulse.r, pulse.g, pulse.b, pulse.alpha), BlendMode::ALPHA);
			}
		}
	}
}

void PulseEffect::reset() {
	pulses.clear();
}

Canvas& PulseEffect::getCanvas() {
	return canvas;
}
