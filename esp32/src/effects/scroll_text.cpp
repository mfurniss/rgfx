#include "scroll_text.h"
#include "text_rendering.h"
#include "effect_utils.h"
#include "gradient_utils.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cmath>
#include <cstring>

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

	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: scroll_text missing or invalid 'color' prop");
		publishError("scroll_text", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	float speed = props["speed"];
	bool repeat = props["repeat"].as<bool>();

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
	} else {
		instance.accentR = 0;
		instance.accentG = 0;
		instance.accentB = 0;
	}

	instance.scrollX = static_cast<float>(canvas.getWidth());
	instance.speed = speed;
	instance.repeat = repeat;
	instance.snapToLed = props["snapToLed"].as<bool>();

	// Parse optional gradient animation (flat gradient array + separate speed/scale props)
	instance.hasGradient = parseGradientFromJson(props, instance.gradientLut);
	if (instance.hasGradient) {
		instance.gradientSpeed = props["gradientSpeed"] | 3.0f;
		instance.gradientScale = props["gradientScale"] | 4.0f;
		instance.gradientTime = 0.0f;
	}

	instances.push_back(instance);
}

void ScrollTextEffect::update(float deltaTime) {
	for (auto it = instances.begin(); it != instances.end();) {
		it->scrollX -= it->speed * deltaTime;

		int16_t textWidth = it->textLen * TEXT_CHAR_WIDTH;
		if (it->scrollX + textWidth < 0) {
			if (it->repeat) {
				it->scrollX = static_cast<float>(canvas.getWidth());
				++it;
			} else {
				it = instances.erase(it);
				continue;
			}
		} else {
			++it;
		}
		// Update gradient animation time (moved before ++it to avoid issues after erase)
	}

	// Update gradient animation time in a separate loop to avoid iterator invalidation
	for (auto& inst : instances) {
		if (inst.hasGradient) {
			inst.gradientTime += deltaTime * (inst.gradientSpeed / 2.0f);
			// Wrap at a reasonable value to prevent float precision issues
			if (inst.gradientTime > 1000.0f) {
				inst.gradientTime -= 1000.0f;
			}
		}
	}
}

void ScrollTextEffect::render() {
	constexpr int16_t ACCENT_OFFSET = 4;

	// Center vertically (snapped to LED boundary)
	int16_t centeredY = (static_cast<int16_t>(canvas.getHeight()) - TEXT_CHAR_HEIGHT) / 2;
	centeredY = (centeredY / TEXT_SCALE) * TEXT_SCALE;

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
				renderChar(canvas, inst.text[i], ax + ACCENT_OFFSET, centeredY + ACCENT_OFFSET,
				           inst.accentR, inst.accentG, inst.accentB, BlendMode::REPLACE);
				ax += TEXT_CHAR_WIDTH;
			}
		}

		// Pass 2: Main text
		int16_t x = baseX;
		for (uint8_t i = 0; i < inst.textLen; i++) {
			uint8_t r, g, b;
			if (inst.hasGradient) {
				// Wave effect: each character offset by gradientScale, cycling over time
				float charOffset = i * inst.gradientScale;
				float position = inst.gradientTime + charOffset;
				// Map position to LUT index (0-99), wrapping around
				uint8_t lutIndex = static_cast<uint8_t>(static_cast<int>(position * 25.5f) % GRADIENT_LUT_SIZE);
				CRGB color = inst.gradientLut[lutIndex];
				r = color.r;
				g = color.g;
				b = color.b;
			} else {
				r = inst.r;
				g = inst.g;
				b = inst.b;
			}

			renderChar(canvas, inst.text[i], x, centeredY, r, g, b, BlendMode::REPLACE);
			x += TEXT_CHAR_WIDTH;
		}
	}
}

void ScrollTextEffect::reset() {
	instances.clear();
}
