#include "background.h"
#include "effect_utils.h"
#include "graphics/canvas.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

BackgroundEffect::BackgroundEffect(const Matrix& m, Canvas& c)
	: state{0.0f, 0.0f, {}, {}, true, false}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	// Initialize both LUTs to black
	fill_solid(state.gradientLut, GRADIENT_LUT_SIZE, CRGB::Black);
	fill_solid(state.targetLut, GRADIENT_LUT_SIZE, CRGB::Black);
}

bool BackgroundEffect::isAllBlack(const CRGB* colors, uint8_t count) {
	for (uint8_t i = 0; i < count; i++) {
		if (colors[i] != CRGB::Black) return false;
	}
	return true;
}

void BackgroundEffect::snapshotCurrentState() {
	// Blend gradientLut and targetLut at current progress into gradientLut
	if (state.fadeDuration <= 0.0f) return;

	float t = state.fadeTime / state.fadeDuration;
	if (t >= 1.0f) {
		// Fade was complete, targetLut is current state
		memcpy(state.gradientLut, state.targetLut, sizeof(state.gradientLut));
	} else {
		// Interpolate current state
		for (int i = 0; i < GRADIENT_LUT_SIZE; i++) {
			state.gradientLut[i] = blend(state.gradientLut[i], state.targetLut[i], (uint8_t)(t * 255));
		}
	}
}

void BackgroundEffect::add(JsonDocument& props) {
	// Parse fadeDuration (default 1000ms, convert to seconds)
	float newFadeDuration = 1.0f;
	if (!props["fadeDuration"].isNull()) {
		newFadeDuration = props["fadeDuration"].as<float>() / 1000.0f;
	}

	// Parse gradient object { colors: string[], orientation: 'horizontal' | 'vertical' }
	if (props["gradient"].isNull() || !props["gradient"].is<JsonObject>()) {
		hal::log("ERROR: background missing or invalid 'gradient' prop");
		publishError("background", "missing or invalid 'gradient' prop", props);
		return;
	}

	JsonObject gradientObj = props["gradient"].as<JsonObject>();

	// Parse colors array
	CRGB colors[MAX_GRADIENT_COLORS];
	uint8_t colorCount = 0;

	if (!gradientObj["colors"].isNull() && gradientObj["colors"].is<JsonArray>()) {
		JsonArray colorsArray = gradientObj["colors"].as<JsonArray>();

		if (colorsArray.size() > MAX_GRADIENT_COLORS) {
			hal::log("ERROR: background gradient colors exceeds max %d", MAX_GRADIENT_COLORS);
			publishError("background", "gradient colors out of range", props);
			return;
		}

		for (JsonVariant colorVal : colorsArray) {
			if (colorVal.is<const char*>() && colorCount < MAX_GRADIENT_COLORS) {
				colors[colorCount++] = parseHexColor(colorVal.as<const char*>());
			}
		}
	}

	// Check if all colors are black (empty array counts as black)
	bool targetIsBlack = (colorCount == 0) || isAllBlack(colors, colorCount);

	// Snapshot current state before generating new target
	// - If mid-fade: blend current progress into gradientLut
	// - If fade complete: copy targetLut to gradientLut (it's now the "current" state)
	if (state.fadeTime < state.fadeDuration && state.fadeDuration > 0.0f) {
		snapshotCurrentState();
	} else if (state.fadeDuration > 0.0f) {
		// Fade was complete, targetLut is the current visible state
		memcpy(state.gradientLut, state.targetLut, sizeof(state.gradientLut));
	}

	// Generate new gradient into targetLut
	if (colorCount == 0) {
		fill_solid(state.targetLut, GRADIENT_LUT_SIZE, CRGB::Black);
	} else {
		generateGradientLut(colors, colorCount, state.targetLut);
	}

	// Parse orientation (defaults to horizontal)
	state.isVertical = false;
	if (!gradientObj["orientation"].isNull() && gradientObj["orientation"].is<const char*>()) {
		state.isVertical = strcmp(gradientObj["orientation"].as<const char*>(), "vertical") == 0;
	}

	// Store new fade duration and reset fade time
	state.fadeDuration = newFadeDuration;
	state.targetIsBlack = targetIsBlack;

	if (newFadeDuration <= 0.0f) {
		// Immediate: copy target to current
		memcpy(state.gradientLut, state.targetLut, sizeof(state.gradientLut));
		state.fadeTime = 0.0f;
	} else {
		// Start cross-fade
		state.fadeTime = 0.0f;
	}
}

void BackgroundEffect::update(float deltaTime) {
	// Skip update if target is black and fade is complete
	if (state.targetIsBlack && state.fadeTime >= state.fadeDuration) {
		return;
	}

	// Update fade progress
	if (state.fadeTime < state.fadeDuration) {
		state.fadeTime += deltaTime;
		if (state.fadeTime > state.fadeDuration) {
			state.fadeTime = state.fadeDuration;
		}
	}
}

void BackgroundEffect::render() {
	// Skip render if target is black and fade is complete
	if (state.targetIsBlack && state.fadeTime >= state.fadeDuration) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// For strips (height=1), always use horizontal gradient regardless of orientation setting
	bool useVertical = state.isVertical && height > 1;

	// Determine if we're cross-fading
	bool isFading = state.fadeTime < state.fadeDuration && state.fadeDuration > 0.0f;
	float t = isFading ? (state.fadeTime / state.fadeDuration) : 1.0f;
	uint8_t blendAmount = (uint8_t)(t * 255);

	for (uint16_t y = 0; y < height; y++) {
		for (uint16_t x = 0; x < width; x++) {
			// Sample gradient based on orientation
			uint8_t lutIndex;
			if (useVertical) {
				lutIndex = (y * (GRADIENT_LUT_SIZE - 1)) / (height - 1);
			} else {
				lutIndex = (width > 1) ? (x * (GRADIENT_LUT_SIZE - 1)) / (width - 1) : 0;
			}

			CRGB color;
			if (isFading) {
				// Interpolate between source and target
				color = blend(state.gradientLut[lutIndex], state.targetLut[lutIndex], blendAmount);
			} else {
				// Fade complete, use target directly
				color = state.targetLut[lutIndex];
			}

			canvas.drawPixel(x, y, color);
		}
	}
}

void BackgroundEffect::reset() {
	state.fadeTime = 0.0f;
	state.fadeDuration = 0.0f;
	state.targetIsBlack = true;
	state.isVertical = false;
	fill_solid(state.gradientLut, GRADIENT_LUT_SIZE, CRGB::Black);
	fill_solid(state.targetLut, GRADIENT_LUT_SIZE, CRGB::Black);
}
