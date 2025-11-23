#include "wipe.h"
#include "effect_utils.h"
#include "canvas.h"

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 100;

WipeEffect::WipeEffect(const Matrix& m) : canvas(m.width * 4, m.height * 4) {}

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
		uint16_t column = wipe.currentColumn(width);
		uint32_t rgba = RGBA(wipe.r, wipe.g, wipe.b, 255);

		uint16_t columnWidth = width * 0.1;
		canvas.drawRectangle(column, 0, columnWidth, height, rgba);
	}
}

void WipeEffect::reset() {
	wipes.clear();
}

Canvas& WipeEffect::getCanvas() {
	return canvas;
}
