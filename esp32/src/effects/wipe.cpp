#include "wipe.h"
#include "effect_utils.h"
#include "canvas.h"

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 100;

WipeEffect::WipeEffect(const Matrix& m) : canvas(m) {}

void WipeEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;

	Wipe newWipe;
	newWipe.r = (color >> 16) & 0xFF;
	newWipe.g = (color >> 8) & 0xFF;
	newWipe.b = color & 0xFF;
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	wipes.push_back(newWipe);
}

void WipeEffect::update(float deltaTime) {
	canvas.clear();

	// Cache deltaTime in milliseconds to avoid redundant calculations
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	// Iterate through all wipes and update elapsed time
	for (auto it = wipes.begin(); it != wipes.end();) {
		it->elapsedTime += deltaTimeMs;
		if (it->elapsedTime >= it->duration) {
			it = wipes.erase(it);
		} else {
			++it;
		}
	}
}

void WipeEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	for (const auto& wipe : wipes) {
		uint32_t rgba = RGBA(wipe.r, wipe.g, wipe.b, 255);
		uint32_t halfDuration = wipe.duration / 2;

		if (wipe.elapsedTime < halfDuration) {
			// First half: fill from left to right
			float progress = static_cast<float>(wipe.elapsedTime) / halfDuration;
			uint16_t fillWidth = static_cast<uint16_t>(progress * width);
			canvas.drawRectangle(0, 0, fillWidth, height, rgba, BlendMode::AVERAGE);
		} else {
			// Second half: disappear from left to right
			float progress = static_cast<float>(wipe.elapsedTime - halfDuration) / halfDuration;
			uint16_t startX = static_cast<uint16_t>(progress * width);
			canvas.drawRectangle(startX, 0, width - startX, height, rgba, BlendMode::AVERAGE);
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}

Canvas& WipeEffect::getCanvas() {
	return canvas;
}
