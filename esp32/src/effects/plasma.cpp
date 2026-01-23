#include "plasma.h"
#include "gradient_utils.h"
#include "hal/types.h"
#include <cmath>

PlasmaEffect::PlasmaEffect(const Matrix& m, Canvas& c) : state{0.0f, 0.0f, 0.0f, {}}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut(state.gradientLut);
}

void PlasmaEffect::add(JsonDocument& props) {
	EnabledState enabledState = fade.parseEnabledProp(props);

	// If turning off or fading out, just update fade state and return
	if (enabledState == EnabledState::OFF || enabledState == EnabledState::FADE_OUT) {
		fade.startFade(enabledState);
		return;
	}

	// Parse scale (0.1-10.0)
	float scale = props["scale"];
	if (scale < 0.1f)
		scale = 0.1f;
	if (scale > 10.0f)
		scale = 10.0f;

	// Parse speed
	float speed = props["speed"];

	// Parse gradient array using shared utility
	parseGradientFromJson(props, state.gradientLut);

	state.scale = scale;
	state.speed = speed;

	fade.startFade(enabledState);
}

void PlasmaEffect::update(float deltaTime) {
	if (fade.isOff()) {
		return;
	}

	// Simple time accumulation
	state.time += deltaTime * state.speed;

	// Wrap at a reasonable value to prevent float precision issues
	if (state.time > 1000.0f) {
		state.time -= 1000.0f;
	}

	fade.updateFade(deltaTime);
}

void PlasmaEffect::render() {
	if (fade.isOff()) {
		return;
	}

	uint8_t alpha = fade.currentAlpha;
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
	fade = FadeState{};
	state.time = 0.0f;
	state.scale = 0.0f;
	state.speed = 0.0f;
	generateDefaultRainbowLut(state.gradientLut);
}

bool PlasmaEffect::isFullyOpaque() const {
	return fade.isFullyOpaque();
}
