#include "background.h"
#include "effect_utils.h"
#include "graphics/canvas.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

BackgroundEffect::BackgroundEffect(const Matrix& m, Canvas& c)
	: state{0, 0, 0, EnabledState::OFF, 0.0f, {}, false, false}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

BackgroundEffect::EnabledState BackgroundEffect::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0) return EnabledState::OFF;
	if (strcmp(str, "on") == 0) return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0) return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0) return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

uint8_t BackgroundEffect::calculateAlpha() const {
	switch (state.enabledState) {
		case EnabledState::OFF:
			return 0;
		case EnabledState::ON:
			return 255;
		case EnabledState::FADE_IN: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			return static_cast<uint8_t>(progress * 255.0f);
		}
		case EnabledState::FADE_OUT: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			return static_cast<uint8_t>((1.0f - progress) * 255.0f);
		}
	}
	return 255;
}

void BackgroundEffect::add(JsonDocument& props) {
	// Parse enabled - support both string and bool for backwards compat
	EnabledState enabledState = EnabledState::ON;
	if (!props["enabled"].isNull()) {
		if (props["enabled"].is<bool>()) {
			enabledState = props["enabled"].as<bool>() ? EnabledState::ON : EnabledState::OFF;
		} else if (props["enabled"].is<const char*>()) {
			enabledState = parseEnabledState(props["enabled"].as<const char*>());
		}
	}

	// If turning off instantly, just set state and return
	if (enabledState == EnabledState::OFF) {
		state.enabledState = EnabledState::OFF;
		return;
	}

	// Handle fadeOut - preserve existing color, just fade
	if (enabledState == EnabledState::FADE_OUT) {
		uint8_t currentAlpha = calculateAlpha();
		state.fadeTime = ((255 - currentAlpha) / 255.0f) * FADE_DURATION;
		state.enabledState = EnabledState::FADE_OUT;
		return;
	}

	// Validate color prop
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: background missing or invalid 'color' prop");
		publishError("background", "missing or invalid 'color' prop", props);
		return;
	}

	// Parse color (fallback when no gradient)
	uint32_t color = parseColor(props["color"]);

	// Replace state (singleton behavior)
	state.r = (color >> 16) & 0xFF;
	state.g = (color >> 8) & 0xFF;
	state.b = color & 0xFF;

	// Parse gradient (overrides solid color when provided)
	state.hasGradient = false;
	if (!props["gradient"].isNull() && props["gradient"].is<JsonArray>()) {
		JsonArray gradientArray = props["gradient"].as<JsonArray>();
		uint8_t colorCount = gradientArray.size();

		if (colorCount >= 2 && colorCount <= MAX_GRADIENT_COLORS) {
			CRGB colors[MAX_GRADIENT_COLORS];
			uint8_t validColors = 0;
			for (JsonVariant colorVal : gradientArray) {
				if (colorVal.is<const char*>() && validColors < MAX_GRADIENT_COLORS) {
					colors[validColors++] = parseHexColor(colorVal.as<const char*>());
				}
			}
			if (validColors >= 2) {
				generateGradientLut(colors, validColors, state.gradientLut);
				state.hasGradient = true;
			}
		}
	}

	// Parse orientation (horizontal or vertical)
	state.isVertical = false;
	if (!props["orientation"].isNull() && props["orientation"].is<const char*>()) {
		state.isVertical = strcmp(props["orientation"].as<const char*>(), "vertical") == 0;
	}

	// For fades, calculate starting fadeTime based on current alpha
	// This allows smooth transitions from any alpha level
	uint8_t currentAlpha = calculateAlpha();
	if (enabledState == EnabledState::FADE_IN) {
		// fadeTime should represent how far along we already are
		// alpha=0 -> fadeTime=0, alpha=255 -> fadeTime=FADE_DURATION
		state.fadeTime = (currentAlpha / 255.0f) * FADE_DURATION;
	} else if (enabledState == EnabledState::FADE_OUT) {
		// alpha=255 -> fadeTime=0, alpha=0 -> fadeTime=FADE_DURATION
		state.fadeTime = ((255 - currentAlpha) / 255.0f) * FADE_DURATION;
	} else {
		state.fadeTime = 0.0f;
	}

	state.enabledState = enabledState;
}

void BackgroundEffect::update(float deltaTime) {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	// Handle fade transitions
	if (state.enabledState == EnabledState::FADE_IN || state.enabledState == EnabledState::FADE_OUT) {
		state.fadeTime += deltaTime;

		if (state.fadeTime >= FADE_DURATION) {
			// Transition to final state
			state.enabledState =
				(state.enabledState == EnabledState::FADE_IN) ? EnabledState::ON : EnabledState::OFF;
			state.fadeTime = 0.0f;
		}
	}
}

void BackgroundEffect::render() {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	uint8_t alpha = calculateAlpha();
	if (alpha == 0) {
		return;
	}

	if (state.hasGradient) {
		uint16_t width = canvas.getWidth();
		uint16_t height = canvas.getHeight();

		for (uint16_t y = 0; y < height; y++) {
			for (uint16_t x = 0; x < width; x++) {
				// Sample gradient based on orientation
				uint8_t lutIndex;
				if (state.isVertical) {
					lutIndex = (height > 1) ? (y * (GRADIENT_LUT_SIZE - 1)) / (height - 1) : 0;
				} else {
					lutIndex = (width > 1) ? (x * (GRADIENT_LUT_SIZE - 1)) / (width - 1) : 0;
				}

				CRGB gradientColor = state.gradientLut[lutIndex];
				uint8_t r = (gradientColor.r * alpha) / 255;
				uint8_t g = (gradientColor.g * alpha) / 255;
				uint8_t b = (gradientColor.b * alpha) / 255;
				canvas.drawPixel(x, y, CRGB(r, g, b));
			}
		}
	} else {
		uint8_t r = (state.r * alpha) / 255;
		uint8_t g = (state.g * alpha) / 255;
		uint8_t b = (state.b * alpha) / 255;
		canvas.fill(CRGB(r, g, b));
	}
}

void BackgroundEffect::reset() {
	state.enabledState = EnabledState::OFF;
	state.r = 0;
	state.g = 0;
	state.b = 0;
	state.fadeTime = 0.0f;
	state.hasGradient = false;
	state.isVertical = false;
}
