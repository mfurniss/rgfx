#include "wipe.h"
#include "effect_utils.h"
#include "graphics/canvas.h"
#include <FastLED.h>
#include <cstring>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const uint32_t DEFAULT_DURATION = 100;

static WipeDirection parseDirection(const char* dir, bool is1D) {
	WipeDirection result;

	if (dir == nullptr || strcmp(dir, "random") == 0) {
		result = static_cast<WipeDirection>(random(4));
	} else if (strcmp(dir, "left") == 0) {
		result = WipeDirection::LEFT;
	} else if (strcmp(dir, "right") == 0) {
		result = WipeDirection::RIGHT;
	} else if (strcmp(dir, "up") == 0) {
		result = WipeDirection::UP;
	} else if (strcmp(dir, "down") == 0) {
		result = WipeDirection::DOWN;
	} else {
		result = static_cast<WipeDirection>(random(4));
	}

	// For 1D strips, vertical directions map to horizontal
	if (is1D) {
		if (result == WipeDirection::UP) result = WipeDirection::LEFT;
		if (result == WipeDirection::DOWN) result = WipeDirection::RIGHT;
	}

	return result;
}

WipeEffect::WipeEffect(const Matrix& m, Canvas& c) : canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

void WipeEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;
	const char* dirStr = props["direction"] | "random";
	bool is1D = canvas.getHeight() == 1;

	Wipe newWipe;
	newWipe.r = (color >> 16) & 0xFF;
	newWipe.g = (color >> 8) & 0xFF;
	newWipe.b = color & 0xFF;
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	newWipe.direction = parseDirection(dirStr, is1D);
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

void WipeEffect::render() {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	for (const auto& wipe : wipes) {
		CRGB color(wipe.r, wipe.g, wipe.b);
		uint32_t halfDuration = wipe.duration / 2;
		float progress;

		if (wipe.elapsedTime < halfDuration) {
			progress = static_cast<float>(wipe.elapsedTime) / halfDuration;
		} else {
			progress = static_cast<float>(wipe.elapsedTime - halfDuration) / halfDuration;
		}

		bool filling = wipe.elapsedTime < halfDuration;

		switch (wipe.direction) {
			case WipeDirection::RIGHT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, fillWidth, height, CRGBA(color), BlendMode::AVERAGE);
				} else {
					uint16_t startX = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(startX, 0, width - startX, height, CRGBA(color), BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::LEFT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(width - fillWidth, 0, fillWidth, height, CRGBA(color), BlendMode::AVERAGE);
				} else {
					uint16_t clearWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, width - clearWidth, height, CRGBA(color), BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::DOWN: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, fillHeight, CRGBA(color), BlendMode::AVERAGE);
				} else {
					uint16_t startY = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, startY, width, height - startY, CRGBA(color), BlendMode::AVERAGE);
				}
				break;
			}
			case WipeDirection::UP: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, height - fillHeight, width, fillHeight, CRGBA(color), BlendMode::AVERAGE);
				} else {
					uint16_t clearHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, height - clearHeight, CRGBA(color), BlendMode::AVERAGE);
				}
				break;
			}
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}
