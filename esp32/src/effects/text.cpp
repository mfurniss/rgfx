#include "text.h"
#include "effect_utils.h"
#include "fonts/den_8x8.h"
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

void TextEffect::renderChar(char c, int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b) {
	const uint8_t* glyph = getGlyph(c);
	if (glyph == nullptr) {
		return;
	}

	CRGB color(r, g, b);

	constexpr uint8_t SCALE = 4;

	for (uint8_t row = 0; row < FONT_CHAR_HEIGHT; row++) {
		uint8_t rowData = pgm_read_byte(&glyph[row]);
		for (uint8_t col = 0; col < FONT_CHAR_WIDTH; col++) {
			if (rowData & (0x80 >> col)) {
				int16_t px = x + (col * SCALE);
				int16_t py = y + (row * SCALE);
				if (px >= 0 && py >= 0) {
					canvas.drawRectangle(static_cast<uint16_t>(px), static_cast<uint16_t>(py),
					                     SCALE, SCALE, color);
				}
			}
		}
	}
}

void TextEffect::render() {
	constexpr int16_t CHAR_SPACING = FONT_CHAR_WIDTH * 4;

	for (const auto& inst : instances) {
		int16_t x = inst.x;
		for (uint8_t i = 0; i < inst.textLen; i++) {
			renderChar(inst.text[i], x, inst.y, inst.r, inst.g, inst.b);
			x += CHAR_SPACING;
		}
	}
}

void TextEffect::reset() {
	instances.clear();
}
