#include "effect_utils.h"
#include "hal/types.h"
#include <string.h>
#include <ctype.h>

// Convert string to lowercase for case-insensitive comparison
static void toLowerCase(char* str) {
	for (int i = 0; str[i]; i++) {
		str[i] = tolower(str[i]);
	}
}

uint32_t parseColor(const char* colorHex) {
	// Handle magic color word: "random"
	if (strcmp(colorHex, "random") == 0) {
		// Random hue at full saturation and value
		// Use random16() which respects random16_set_seed(), not random8() which uses hardware RNG
		uint8_t randomHue = random16() & 0xFF;
		CHSV hsv(randomHue, 255, 255);
		CRGB rgb = hsv;
		return ((uint32_t)rgb.r << 16) | ((uint32_t)rgb.g << 8) | rgb.b;
	}

	// Try FastLED HTML color names (case-insensitive)
	// Make lowercase copy for comparison
	char lowerName[32];
	strncpy(lowerName, colorHex, sizeof(lowerName) - 1);
	lowerName[sizeof(lowerName) - 1] = '\0';
	toLowerCase(lowerName);

	// Check common colors first (optimization)
	if (strcmp(lowerName, "red") == 0) return CRGB::Red;
	if (strcmp(lowerName, "green") == 0) return CRGB::Green;
	if (strcmp(lowerName, "blue") == 0) return CRGB::Blue;
	if (strcmp(lowerName, "white") == 0) return CRGB::White;
	if (strcmp(lowerName, "black") == 0) return CRGB::Black;
	if (strcmp(lowerName, "yellow") == 0) return CRGB::Yellow;
	if (strcmp(lowerName, "cyan") == 0) return CRGB::Cyan;
	if (strcmp(lowerName, "magenta") == 0) return CRGB::Magenta;
	if (strcmp(lowerName, "orange") == 0) return CRGB::Orange;
	if (strcmp(lowerName, "purple") == 0) return CRGB::Purple;
	if (strcmp(lowerName, "pink") == 0) return CRGB::Pink;
	if (strcmp(lowerName, "lime") == 0) return CRGB::Lime;
	if (strcmp(lowerName, "aqua") == 0) return CRGB::Aqua;
	if (strcmp(lowerName, "navy") == 0) return CRGB::Navy;
	if (strcmp(lowerName, "teal") == 0) return CRGB::Teal;
	if (strcmp(lowerName, "olive") == 0) return CRGB::Olive;
	if (strcmp(lowerName, "maroon") == 0) return CRGB::Maroon;
	if (strcmp(lowerName, "silver") == 0) return CRGB::Silver;
	if (strcmp(lowerName, "gray") == 0) return CRGB::Gray;
	if (strcmp(lowerName, "grey") == 0) return CRGB::Grey;

	// Handle hex color strings (fallback)
	if (colorHex[0] == '#') {
		colorHex++;  // Skip # prefix
	}
	return (uint32_t)strtol(colorHex, NULL, 16);
}

uint32_t randomColor() {
	uint8_t randomHue = random8();
	CHSV hsv(randomHue, 255, 255);
	CRGB rgb = hsv;
	return ((uint32_t)rgb.r << 16) | ((uint32_t)rgb.g << 8) | rgb.b;
}

// FadeState implementation

EnabledState FadeState::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0)
		return EnabledState::OFF;
	if (strcmp(str, "on") == 0)
		return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0)
		return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0)
		return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

void FadeState::updateAlpha() {
	switch (enabledState) {
		case EnabledState::OFF:
			currentAlpha = 0;
			break;
		case EnabledState::ON:
			currentAlpha = 255;
			break;
		case EnabledState::FADE_IN: {
			float progress = fadeTime / FADE_DURATION;
			if (progress > 1.0f)
				progress = 1.0f;
			currentAlpha = static_cast<uint8_t>(progress * 255.0f);
			break;
		}
		case EnabledState::FADE_OUT: {
			float progress = fadeTime / FADE_DURATION;
			if (progress > 1.0f)
				progress = 1.0f;
			currentAlpha = static_cast<uint8_t>((1.0f - progress) * 255.0f);
			break;
		}
	}
}

bool FadeState::updateFade(float deltaTime) {
	if (enabledState == EnabledState::OFF) {
		return false;
	}

	if (enabledState == EnabledState::FADE_IN || enabledState == EnabledState::FADE_OUT) {
		fadeTime += deltaTime;

		if (fadeTime >= FADE_DURATION) {
			enabledState = (enabledState == EnabledState::FADE_IN) ? EnabledState::ON : EnabledState::OFF;
			fadeTime = 0.0f;
		}

		updateAlpha();
	}

	return enabledState != EnabledState::OFF;
}

EnabledState FadeState::parseEnabledProp(JsonDocument& props) {
	EnabledState newState = EnabledState::ON;
	if (!props["enabled"].isNull()) {
		if (props["enabled"].is<bool>()) {
			newState = props["enabled"].as<bool>() ? EnabledState::ON : EnabledState::OFF;
		} else if (props["enabled"].is<const char*>()) {
			newState = parseEnabledState(props["enabled"].as<const char*>());
		}
	}
	return newState;
}

void FadeState::startFade(EnabledState newState) {
	if (newState == EnabledState::OFF) {
		enabledState = EnabledState::OFF;
		currentAlpha = 0;
		return;
	}

	if (newState == EnabledState::FADE_OUT) {
		fadeTime = ((255 - currentAlpha) / 255.0f) * FADE_DURATION;
		enabledState = EnabledState::FADE_OUT;
		return;
	}

	if (newState == EnabledState::FADE_IN) {
		fadeTime = (currentAlpha / 255.0f) * FADE_DURATION;
	} else {
		fadeTime = 0.0f;
		currentAlpha = (newState == EnabledState::ON) ? 255 : 0;
	}

	enabledState = newState;
}
