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
	struct PlasmaState {
		float time;   // Accumulated time in seconds
		float scale;  // Pattern frequency (0.1 - 10.0)
		float speed;  // Speed multiplier (1.0 = normal)
		bool enabled;
		CRGB gradientLut[GRADIENT_LUT_SIZE];  // Pre-calculated gradient lookup table
	};

	PlasmaState state;
	Canvas& canvas;

	void generateGradientLut(const CRGB* colors, uint8_t colorCount);
	void generateDefaultRainbowLut();
	CRGB parseHexColor(const char* hex);

   public:
	PlasmaEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
