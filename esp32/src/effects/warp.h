#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "gradient_utils.h"

/**
 * Warp Effect
 *
 * Old-school 3D-type warp effect where a gradient radiates FROM THE CENTER
 * of the display outward (or inward with negative speed).
 *
 * Orientation determines radiation direction:
 * - "horizontal": gradient radiates left/right from vertical center line
 * - "vertical": gradient radiates up/down from horizontal center line
 *
 * Rendered as strips PERPENDICULAR to the radiation direction.
 */
class WarpEffect : public IEffect {
   private:
	enum class EnabledState : uint8_t { OFF, ON, FADE_IN, FADE_OUT };

	static constexpr float FADE_DURATION = 1.0f;  // 1 second

	struct WarpState {
		float time;   // Accumulated time for animation
		float speed;  // Animation speed (positive=expand, negative=collapse)
		float scale;  // Gradient stretch factor (0.1 - 10.0)
		bool isVertical;  // true=radiates up/down, false=radiates left/right
		EnabledState enabledState;
		float fadeTime;
		uint8_t currentAlpha;  // Pre-calculated alpha for render loop
		CRGB gradientLut[GRADIENT_LUT_SIZE];  // Pre-calculated gradient lookup table
	};

	WarpState state;
	Canvas& canvas;

	static EnabledState parseEnabledState(const char* str);
	void updateAlpha();

   public:
	WarpEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	// Returns true if warp is fully opaque (used to skip background render)
	bool isFullyOpaque() const;
};
