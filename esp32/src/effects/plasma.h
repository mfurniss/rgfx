#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
#include "graphics/canvas.h"
#include "gradient_utils.h"

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
		uint16_t phaseOffset;  // Per-driver offset into noise space
		CRGB gradientLut[GRADIENT_LUT_SIZE];
	};

	PlasmaState state;
	FadeState fade;
	Canvas& canvas;

   public:
	PlasmaEffect(Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	bool isFullyOpaque() const;
};
