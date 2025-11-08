#include "wipe.h"
#include "matrix.h"
#include "effect_utils.h"
#include <FastLED.h>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 100;

WipeEffect::WipeEffect() {}

void WipeEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;

	Wipe newWipe;
	newWipe.color = CRGB(color);
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	wipes.push_back(newWipe);
}

void WipeEffect::update(float deltaTime) {
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

void WipeEffect::render(Matrix& matrix) {
	for (const auto& wipe : wipes) {
		uint16_t column = wipe.currentColumn(matrix.width);

		// Render single column (vertical line) moving left to right
		for (uint16_t y = 0; y < matrix.height; y++) {
			if (column < matrix.width) {
				matrix.led(column, y) = wipe.color;
			}
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}
