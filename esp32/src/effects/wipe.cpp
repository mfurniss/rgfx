#include "wipe.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "hal/types.h"
#include "graphics/canvas.h"
#include "network/mqtt.h"

WipeEffect::WipeEffect(const Matrix& m, Canvas& c) : canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

static BlendMode parseBlendMode(const char* mode) {
	if (mode != nullptr && strcmp(mode, "replace") == 0) {
		return BlendMode::REPLACE;
	}
	return BlendMode::ADDITIVE;
}

void WipeEffect::add(JsonDocument& props) {
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: wipe missing or invalid 'color' prop");
		publishError("wipe", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	uint32_t duration = props["duration"];
	const char* dirStr = props["direction"] | "";
	const char* blendModeStr = props["blendMode"];
	bool is1D = canvas.getHeight() == 1;

	Wipe newWipe;
	newWipe.color = RGBColor(color);
	newWipe.duration = duration;
	newWipe.elapsedTime = 0;
	newWipe.direction = parseDirection(dirStr, is1D);
	newWipe.blendMode = parseBlendMode(blendModeStr);

	wipes.add(newWipe);
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
		CRGB color = wipe.color;
		uint32_t halfDuration = wipe.duration / 2;
		float progress;

		if (wipe.elapsedTime < halfDuration) {
			progress = static_cast<float>(wipe.elapsedTime) / halfDuration;
		} else {
			progress = static_cast<float>(wipe.elapsedTime - halfDuration) / halfDuration;
		}

		bool filling = wipe.elapsedTime < halfDuration;

		switch (wipe.direction) {
			case Direction::RIGHT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, fillWidth, height, CRGBA(color), wipe.blendMode);
				} else {
					uint16_t startX = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(startX, 0, width - startX, height, CRGBA(color), wipe.blendMode);
				}
				break;
			}
			case Direction::LEFT: {
				if (filling) {
					uint16_t fillWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(width - fillWidth, 0, fillWidth, height, CRGBA(color), wipe.blendMode);
				} else {
					uint16_t clearWidth = static_cast<uint16_t>(progress * width);
					canvas.drawRectangle(0, 0, width - clearWidth, height, CRGBA(color), wipe.blendMode);
				}
				break;
			}
			case Direction::DOWN: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, fillHeight, CRGBA(color), wipe.blendMode);
				} else {
					uint16_t startY = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, startY, width, height - startY, CRGBA(color), wipe.blendMode);
				}
				break;
			}
			case Direction::UP: {
				if (filling) {
					uint16_t fillHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, height - fillHeight, width, fillHeight, CRGBA(color), wipe.blendMode);
				} else {
					uint16_t clearHeight = static_cast<uint16_t>(progress * height);
					canvas.drawRectangle(0, 0, width, height - clearHeight, CRGBA(color), wipe.blendMode);
				}
				break;
			}
		}
	}
}

void WipeEffect::reset() {
	wipes.clear();
}
