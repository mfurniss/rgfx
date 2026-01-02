#include "text.h"
#include "text_rendering.h"
#include "effect_utils.h"
#include "gradient_utils.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

namespace {
	// Calculate wrapped position for character at given index
	void getWrappedPosition(int16_t startX, int16_t startY,
	                        uint8_t charIndex, uint16_t canvasWidth,
	                        int16_t& outX, int16_t& outY) {
		int16_t firstRowChars = (canvasWidth - startX) / TEXT_CHAR_WIDTH;
		if (firstRowChars < 0) firstRowChars = 0;

		if (charIndex < firstRowChars) {
			outX = startX + (charIndex * TEXT_CHAR_WIDTH);
			outY = startY;
		} else {
			int16_t charsPerFullRow = canvasWidth / TEXT_CHAR_WIDTH;
			if (charsPerFullRow < 1) charsPerFullRow = 1;

			int16_t remainingChars = charIndex - firstRowChars;
			int16_t additionalRows = 1 + (remainingChars / charsPerFullRow);
			int16_t colInRow = remainingChars % charsPerFullRow;

			outX = colInRow * TEXT_CHAR_WIDTH;
			outY = startY + (additionalRows * TEXT_CHAR_HEIGHT);
		}
	}
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

	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: text missing or invalid 'color' prop");
		publishError("text", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	int16_t x = props["x"];
	int16_t y = props["y"];
	uint32_t durationMs = props["duration"];

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

	const char* alignStr = props["align"] | "left";
	instance.align = TextAlign::LEFT;
	if (strcmp(alignStr, "center") == 0) {
		instance.align = TextAlign::CENTER;
	} else if (strcmp(alignStr, "right") == 0) {
		instance.align = TextAlign::RIGHT;
	}

	// Parse optional gradient animation
	ColorGradientResult gradientResult = parseColorGradientFromJson(props, instance.gradientLut);
	instance.hasGradient = gradientResult.hasGradient;
	if (instance.hasGradient) {
		instance.gradientSpeed = gradientResult.speed;
		instance.gradientScale = gradientResult.scale;
		instance.gradientTime = 0.0f;
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
	constexpr int16_t ACCENT_OFFSET = 4;
	uint16_t canvasWidth = canvas.getWidth();

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

		// Calculate effective x position based on alignment
		int16_t effectiveX = inst.x;
		if (inst.align != TextAlign::LEFT) {
			int16_t textWidthCanvas = inst.textLen * TEXT_CHAR_WIDTH;
			if (inst.align == TextAlign::CENTER) {
				effectiveX = (static_cast<int16_t>(canvasWidth) - textWidthCanvas) / 2;
			} else {  // RIGHT
				effectiveX = static_cast<int16_t>(canvasWidth) - textWidthCanvas;
			}
			// Snap to LED boundary for crisp rendering
			effectiveX = (effectiveX / TEXT_SCALE) * TEXT_SCALE;
		}

		// Pass 1: Accent (if present)
		if (inst.hasAccent) {
			for (uint8_t i = 0; i < inst.textLen; i++) {
				int16_t charX, charY;
				getWrappedPosition(effectiveX, inst.y, i, canvasWidth, charX, charY);
				renderChar(canvas, inst.text[i], charX + ACCENT_OFFSET, charY + ACCENT_OFFSET,
				           inst.accentR, inst.accentG, inst.accentB, alpha, BlendMode::ALPHA);
			}
		}

		// Pass 2: Main text
		for (uint8_t i = 0; i < inst.textLen; i++) {
			int16_t charX, charY;
			getWrappedPosition(effectiveX, inst.y, i, canvasWidth, charX, charY);

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

			renderChar(canvas, inst.text[i], charX, charY, r, g, b, alpha, BlendMode::ALPHA);
		}
	}
}

void TextEffect::reset() {
	instances.clear();
}
