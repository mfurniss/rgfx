#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

static const uint8_t GRADIENT_LUT_SIZE = 100;
static const uint8_t MAX_GRADIENT_COLORS = 20;

/**
 * Plasma Effect
 *
 * Classic demoscene plasma effect using Perlin noise.
 * Fills the entire canvas with animated colors from a user-defined gradient.
 * Renders on top of background with alpha blending.
 */
class PlasmaEffect : public IEffect {
   private:
	enum class EnabledState : uint8_t { OFF, ON, FADE_IN, FADE_OUT };

	static constexpr float FADE_DURATION = 1.0f;  // 1 second

	struct PlasmaState {
		float time;   // Accumulated time in seconds
		float scale;  // Pattern frequency (0.1 - 10.0)
		float speed;  // Speed multiplier (1.0 = normal)
		EnabledState enabledState;
		float fadeTime;
		uint8_t currentAlpha;  // Pre-calculated alpha for render loop
		CRGB gradientLut[GRADIENT_LUT_SIZE];  // Pre-calculated gradient lookup table
	};

	PlasmaState state;
	Canvas& canvas;

	void generateGradientLut(const CRGB* colors, uint8_t colorCount);
	void generateDefaultRainbowLut();
	CRGB parseHexColor(const char* hex);
	static EnabledState parseEnabledState(const char* str);
	void updateAlpha();

   public:
	PlasmaEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	// Returns true if plasma is fully opaque (used to skip background render)
	bool isFullyOpaque() const;
};
