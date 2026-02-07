#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "gradient_utils.h"
#include "graphics/canvas.h"

/**
 * Background Effect
 *
 * Singleton gradient background that fills the entire canvas.
 * For solid colors, use a single-color gradient.
 * New calls to add() replace the previous background state.
 * Renders FIRST, before all other effects, so other effects composite on top.
 */
class BackgroundEffect : public IEffect {
   private:
	struct BackgroundState {
		float fadeTime;                        // Current fade progress
		float fadeDuration;                    // Fade duration in seconds (0 = immediate)
		CRGB gradientLut[GRADIENT_LUT_SIZE];   // Current/source gradient
		CRGB targetLut[GRADIENT_LUT_SIZE];     // Target gradient for cross-fade
		bool targetIsBlack;                    // True when target is all-black
		bool isVertical;
	};

	BackgroundState state;
	Canvas& canvas;

	void snapshotCurrentState();
	static bool isAllBlack(const CRGB* colors, uint8_t count);

   public:
	BackgroundEffect(Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
