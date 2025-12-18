#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

/**
 * Plasma Effect
 *
 * Classic demoscene plasma effect using overlapping sine waves.
 * Fills the entire canvas with animated rainbow colors.
 * Renders on top of background with alpha blending.
 */
class PlasmaEffect : public IEffect {
   private:
	struct PlasmaState {
		float time;        // Accumulated time in seconds
		float scale;       // Pattern frequency (0.1 - 10.0)
		float speed;       // Speed multiplier (1.0 = normal)
		float colorShift;  // Hue offset (-128 to 128, shifts color palette)
		bool enabled;
	};

	PlasmaState state;
	Canvas& canvas;

   public:
	PlasmaEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
