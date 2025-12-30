#include "plasma.h"
#include "gradient_utils.h"
#include "hal/types.h"
#include <cmath>
#include <cstring>

PlasmaEffect::PlasmaEffect(const Matrix& m, Canvas& c)
	: state{0.0f, 0.0f, 0.0f, EnabledState::OFF, 0.0f, 0, {}}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut(state.gradientLut);
}

PlasmaEffect::EnabledState PlasmaEffect::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0) return EnabledState::OFF;
	if (strcmp(str, "on") == 0) return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0) return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0) return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

void PlasmaEffect::updateAlpha() {
	switch (state.enabledState) {
		case EnabledState::OFF:
			state.currentAlpha = 0;
			break;
		case EnabledState::ON:
			state.currentAlpha = 255;
			break;
		case EnabledState::FADE_IN: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>(progress * 255.0f);
			break;
		}
		case EnabledState::FADE_OUT: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>((1.0f - progress) * 255.0f);
			break;
		}
	}
}

void PlasmaEffect::add(JsonDocument& props) {
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
		state.currentAlpha = 0;
		return;
	}

	// Handle fadeOut - preserve existing state, just fade
	if (enabledState == EnabledState::FADE_OUT) {
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
		state.enabledState = EnabledState::FADE_OUT;
		return;
	}

	// Parse scale (0.1-10.0)
	float scale = props["scale"];
	if (scale < 0.1f) scale = 0.1f;
	if (scale > 10.0f) scale = 10.0f;

	// Parse speed
	float speed = props["speed"];

	// Parse gradient array using shared utility
	parseGradientFromJson(props, state.gradientLut);

	state.scale = scale;
	state.speed = speed;

	// For fades, calculate starting fadeTime based on current alpha
	// This allows smooth transitions from any alpha level
	if (enabledState == EnabledState::FADE_IN) {
		// fadeTime should represent how far along we already are
		// alpha=0 -> fadeTime=0, alpha=255 -> fadeTime=FADE_DURATION
		state.fadeTime = (state.currentAlpha / 255.0f) * FADE_DURATION;
	} else if (enabledState == EnabledState::FADE_OUT) {
		// alpha=255 -> fadeTime=0, alpha=0 -> fadeTime=FADE_DURATION
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
	} else {
		state.fadeTime = 0.0f;
		// Instant on/off
		state.currentAlpha = (enabledState == EnabledState::ON) ? 255 : 0;
	}

	state.enabledState = enabledState;
}

void PlasmaEffect::update(float deltaTime) {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	// Simple time accumulation
	state.time += deltaTime * state.speed;

	// Wrap at a reasonable value to prevent float precision issues
	if (state.time > 1000.0f) {
		state.time -= 1000.0f;
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

		updateAlpha();
	}
}

void PlasmaEffect::render() {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	uint8_t alpha = state.currentAlpha;
	if (alpha == 0) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Scale controls noise frequency - multiply coords before passing to noise
	uint16_t noiseScale = (uint16_t)(state.scale * 3.0f);
	// Time offset for animation - third dimension of noise field
	uint16_t timeOffset = (uint16_t)(state.time * 100.0f);

	constexpr uint16_t step = 4;

	// Gradient offset rotates the palette over time for full color coverage
	int16_t gradientOffset = (int16_t)(state.time * 20.0f);

	// Strip layout: height=1, fill 4 pixels per block horizontally
	if (height == 1) {
		CRGB* pixels = canvas.getPixels();
		uint8_t invAlpha = 255 - alpha;
		for (uint16_t x = 0; x < width; x += step) {
			uint8_t noise = inoise8(x * noiseScale, 0, timeOffset);
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			CRGB color = state.gradientLut[lutIndex];
			if (alpha < 255) {
				// Alpha blend with existing pixel
				for (uint16_t i = 0; i < step; i++) {
					CRGB& p = pixels[x + i];
					p.r = (color.r * alpha + p.r * invAlpha) / 255;
					p.g = (color.g * alpha + p.g * invAlpha) / 255;
					p.b = (color.b * alpha + p.b * invAlpha) / 255;
				}
			} else {
				pixels[x] = pixels[x + 1] = pixels[x + 2] = pixels[x + 3] = color;
			}
		}
		return;
	}

	// Matrix layout: fill 4x4 blocks with alpha blending
	for (uint16_t y = 0; y < height; y += step) {
		for (uint16_t x = 0; x < width; x += step) {
			// 3D Perlin noise: x, y for position, time for animation
			uint8_t noise = inoise8(x * noiseScale, y * noiseScale, timeOffset);

			// Map noise (0-255) + offset to LUT index (0-99)
			uint8_t shiftedNoise = (uint8_t)(noise + gradientOffset);
			uint8_t lutIndex = (uint8_t)((uint16_t)shiftedNoise * (GRADIENT_LUT_SIZE - 1) / 255);
			CRGB color = state.gradientLut[lutIndex];
			canvas.fillBlock4x4Alpha(x, y, color, alpha);
		}
	}
}

void PlasmaEffect::reset() {
	state.enabledState = EnabledState::OFF;
	state.time = 0.0f;
	state.scale = 0.0f;
	state.speed = 0.0f;
	state.fadeTime = 0.0f;
	state.currentAlpha = 0;
	generateDefaultRainbowLut(state.gradientLut);
}

bool PlasmaEffect::isFullyOpaque() const {
	return state.currentAlpha == 255;
}
