#include "text.h"
#include "text_rendering.h"
#include "effect_utils.h"
#include "generated/effect_defaults.h"
#include "gradient_utils.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

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

	// Parse gradient (required, min 1 color)
	// Single-color gradient acts as solid color (no animation)
	// Multi-color gradient enables animated gradient effect
	CRGB gradientLut[GRADIENT_LUT_SIZE];
	TextGradientResult gradient = parseTextGradientFromJson(props, gradientLut);
	if (!gradient.valid) {
		hal::log("ERROR: text missing or invalid 'gradient' prop");
		publishError("text", "missing or invalid 'gradient' prop", props);
		return;
	}
	uint32_t durationMs = props["duration"] | effect_defaults::text::duration;

	TextInstance instance;
	instance.textLen = static_cast<uint8_t>(strlen(text));
	if (instance.textLen > MAX_TEXT_LENGTH - 1) {
		instance.textLen = MAX_TEXT_LENGTH - 1;
	}
	strncpy(instance.text, text, instance.textLen);
	instance.text[instance.textLen] = '\0';

	instance.r = gradient.r;
	instance.g = gradient.g;
	instance.b = gradient.b;

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

	instance.duration = durationMs / 1000.0f;
	instance.elapsedTime = 0.0f;

	// Copy gradient LUT only when animating (2+ colors)
	instance.hasGradient = gradient.animate;
	if (instance.hasGradient) {
		memcpy(instance.gradientLut, gradientLut, sizeof(gradientLut));
		instance.gradientSpeed = props["gradientSpeed"] | 3.0f;
		instance.gradientScale = props["gradientScale"] | 4.0f;
		instance.gradientTime = 0.0f;
	}

	// Cap vector size to prevent unbounded growth under high load
	static constexpr size_t MAX_TEXT_INSTANCES = 64;
	if (instances.size() >= MAX_TEXT_INSTANCES) {
		instances.erase(instances.begin());  // Drop oldest
	}
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
		// Update gradient animation time
		if (it->hasGradient) {
			it->gradientTime += deltaTime * (it->gradientSpeed / 2.0f);
			// Wrap at a reasonable value to prevent float precision issues
			if (it->gradientTime > 1000.0f) {
				it->gradientTime -= 1000.0f;
			}
		}
		++it;
	}
}

void TextEffect::render() {
	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

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

		// Center horizontally (snapped to LED boundary)
		int16_t textWidthCanvas = inst.textLen * TEXT_CHAR_WIDTH;
		int16_t effectiveX = (static_cast<int16_t>(canvasWidth) - textWidthCanvas) / 2;
		effectiveX = (effectiveX / TEXT_SCALE) * TEXT_SCALE;

		// Center vertically (snapped to LED boundary)
		int16_t effectiveY = (static_cast<int16_t>(canvasHeight) - TEXT_CHAR_HEIGHT) / 2;
		effectiveY = (effectiveY / TEXT_SCALE) * TEXT_SCALE;

		// Render text - use optimized path when no accent
		if (inst.hasAccent) {
			for (uint8_t i = 0; i < inst.textLen; i++) {
				int16_t charX = effectiveX + (i * TEXT_CHAR_WIDTH);

				uint8_t r, g, b;
				if (inst.hasGradient) {
					float charOffset = i * inst.gradientScale;
					float position = inst.gradientTime + charOffset;
					int raw = static_cast<int>(position * 25.5f) % GRADIENT_LUT_SIZE;
					uint8_t lutIndex = static_cast<uint8_t>(raw < 0 ? raw + GRADIENT_LUT_SIZE : raw);
					CRGB color = inst.gradientLut[lutIndex];
					r = color.r;
					g = color.g;
					b = color.b;
				} else {
					r = inst.r;
					g = inst.g;
					b = inst.b;
				}

				renderCharWithAccent(canvas, inst.text[i], charX, effectiveY,
				                     r, g, b,
				                     inst.accentR, inst.accentG, inst.accentB,
				                     alpha, BlendMode::ALPHA);
			}
		} else {
			for (uint8_t i = 0; i < inst.textLen; i++) {
				int16_t charX = effectiveX + (i * TEXT_CHAR_WIDTH);

				uint8_t r, g, b;
				if (inst.hasGradient) {
					float charOffset = i * inst.gradientScale;
					float position = inst.gradientTime + charOffset;
					int raw = static_cast<int>(position * 25.5f) % GRADIENT_LUT_SIZE;
					uint8_t lutIndex = static_cast<uint8_t>(raw < 0 ? raw + GRADIENT_LUT_SIZE : raw);
					CRGB color = inst.gradientLut[lutIndex];
					r = color.r;
					g = color.g;
					b = color.b;
				} else {
					r = inst.r;
					g = inst.g;
					b = inst.b;
				}

				renderChar(canvas, inst.text[i], charX, effectiveY, r, g, b, alpha, BlendMode::ALPHA);
			}
		}
	}
}

void TextEffect::reset() {
	instances.clear();
}
