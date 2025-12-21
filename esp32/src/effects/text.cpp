#include "text.h"
#include "text_rendering.h"
#include "effect_utils.h"
#include <cstring>

namespace {
	constexpr uint32_t TEXT_DEFAULT_COLOR = 0xFFFFFF;
}  // namespace

TextEffect::TextEffect(const Matrix& m, Canvas& c) : matrix(m), canvas(c) {
	instances.reserve(8);
}

void TextEffect::add(JsonDocument& props) {
	if (matrix.layoutType == LayoutType::STRIP) {
		return;
	}

	const char* text = props["text"] | "";
	if (text[0] == '\0') {
		return;
	}

	uint32_t color = props["color"] ? parseColor(props["color"]) : TEXT_DEFAULT_COLOR;
	int16_t x = props["x"] | 0;
	int16_t y = props["y"] | 0;
	uint32_t durationMs = props["duration"] | 0;

	TextInstance instance;
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
	} else {
		instance.accentR = 0;
		instance.accentG = 0;
		instance.accentB = 0;
	}

	instance.x = x;
	instance.y = y;
	instance.duration = durationMs / 1000.0f;
	instance.elapsedTime = 0.0f;

	instances.push_back(instance);
}

void TextEffect::update(float deltaTime) {
	for (auto it = instances.begin(); it != instances.end();) {
		if (it->duration > 0) {
			it->elapsedTime += deltaTime;
			if (it->elapsedTime >= it->duration) {
				it = instances.erase(it);
				continue;
			}
		}
		++it;
	}
}

void TextEffect::render() {
	constexpr int16_t ACCENT_OFFSET = 4;

	for (const auto& inst : instances) {
		// Calculate alpha for fade-out during last half of duration
		uint8_t alpha = 255;
		if (inst.duration > 0) {
			float progress = inst.elapsedTime / inst.duration;
			if (progress > 0.5f) {
				float fadeProgress = (progress - 0.5f) / 0.5f;
				alpha = static_cast<uint8_t>(255.0f * (1.0f - fadeProgress));
			}
		}

		// Pass 1: Accent (if present)
		if (inst.hasAccent) {
			int16_t ax = inst.x;
			for (uint8_t i = 0; i < inst.textLen; i++) {
				renderChar(canvas, inst.text[i], ax + ACCENT_OFFSET, inst.y + ACCENT_OFFSET,
				           inst.accentR, inst.accentG, inst.accentB, alpha, BlendMode::ALPHA);
				ax += CHAR_WIDTH;
			}
		}

		// Pass 2: Main text
		int16_t x = inst.x;
		for (uint8_t i = 0; i < inst.textLen; i++) {
			renderChar(canvas, inst.text[i], x, inst.y, inst.r, inst.g, inst.b, alpha, BlendMode::ALPHA);
			x += CHAR_WIDTH;
		}
	}
}

void TextEffect::reset() {
	instances.clear();
}
