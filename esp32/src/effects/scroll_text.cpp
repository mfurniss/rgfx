#include "scroll_text.h"
#include "text_rendering.h"
#include "effect_utils.h"
#include <cmath>
#include <cstring>

namespace {
	constexpr uint32_t TEXT_DEFAULT_COLOR = 0xFFFFFF;
	constexpr float DEFAULT_SCROLL_SPEED = 60.0f;  // Canvas pixels per second
}  // namespace

ScrollTextEffect::ScrollTextEffect(const Matrix& m, Canvas& c) : matrix(m), canvas(c) {
	instances.reserve(4);
}

void ScrollTextEffect::add(JsonDocument& props) {
	if (matrix.layoutType == LayoutType::STRIP) {
		return;
	}

	const char* text = props["text"] | "";
	if (text[0] == '\0') {
		return;
	}

	uint32_t color = props["color"] ? parseColor(props["color"]) : TEXT_DEFAULT_COLOR;
	int16_t y = props["y"] | 0;
	float speed = props["speed"] | DEFAULT_SCROLL_SPEED;
	bool repeat = props["repeat"] | true;

	ScrollInstance instance;
	instance.textLen = static_cast<uint8_t>(strlen(text));
	if (instance.textLen > MAX_TEXT_LENGTH - 1) {
		instance.textLen = MAX_TEXT_LENGTH - 1;
	}
	strncpy(instance.text, text, instance.textLen);
	instance.text[instance.textLen] = '\0';

	instance.r = (color >> 16) & 0xFF;
	instance.g = (color >> 8) & 0xFF;
	instance.b = color & 0xFF;

	instance.hasAccent = !props["accentColor"].isNull();
	if (instance.hasAccent) {
		uint32_t accent = parseColor(props["accentColor"]);
		instance.accentR = (accent >> 16) & 0xFF;
		instance.accentG = (accent >> 8) & 0xFF;
		instance.accentB = accent & 0xFF;
	}

	instance.y = y;
	instance.scrollX = static_cast<float>(canvas.getWidth());
	instance.speed = speed;
	instance.repeat = repeat;
	instance.snapToLed = props["snapToLed"] | true;

	instances.push_back(instance);
}

void ScrollTextEffect::update(float deltaTime) {
	for (auto it = instances.begin(); it != instances.end();) {
		it->scrollX -= it->speed * deltaTime;

		int16_t textWidth = it->textLen * CHAR_WIDTH;
		if (it->scrollX + textWidth < 0) {
			if (it->repeat) {
				it->scrollX = static_cast<float>(canvas.getWidth());
				++it;
			} else {
				it = instances.erase(it);
			}
		} else {
			++it;
		}
	}
}

void ScrollTextEffect::render() {
	constexpr int16_t ACCENT_OFFSET = 4;

	for (const auto& inst : instances) {
		int16_t baseX;
		if (inst.snapToLed) {
			// Snap to LED boundary (4 canvas pixels per LED) to eliminate shimmer
			baseX = static_cast<int16_t>(std::round(inst.scrollX / 4.0f)) * 4;
		} else {
			baseX = static_cast<int16_t>(inst.scrollX);
		}

		// Pass 1: Accent (if present)
		if (inst.hasAccent) {
			int16_t ax = baseX;
			for (uint8_t i = 0; i < inst.textLen; i++) {
				renderChar(canvas, inst.text[i], ax + ACCENT_OFFSET, inst.y + ACCENT_OFFSET,
				           inst.accentR, inst.accentG, inst.accentB, BlendMode::REPLACE);
				ax += CHAR_WIDTH;
			}
		}

		// Pass 2: Main text
		int16_t x = baseX;
		for (uint8_t i = 0; i < inst.textLen; i++) {
			renderChar(canvas, inst.text[i], x, inst.y, inst.r, inst.g, inst.b, BlendMode::REPLACE);
			x += CHAR_WIDTH;
		}
	}
}

void ScrollTextEffect::reset() {
	instances.clear();
}
