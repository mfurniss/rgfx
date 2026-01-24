#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
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
	static constexpr uint16_t MAX_DIMENSION = 512;

	struct WarpState {
		float time;       // Accumulated time for animation
		float speed;      // Animation speed (positive=expand, negative=collapse)
		float scale;      // Gradient stretch factor
		bool isVertical;  // true=radiates up/down, false=radiates left/right
		CRGB gradientLut[GRADIENT_LUT_SIZE];
		// Precomputed distance LUT for CPU optimization
		float scaledDist[MAX_DIMENSION];
		uint16_t cachedDimension;  // Dimension for which scaledDist was computed
		float cachedScale;         // Scale value used for computation
	};

	WarpState state;
	FadeState fade;
	Canvas& canvas;

	void precomputeDistances(uint16_t dimension);
	CRGB getColorForDistance(uint16_t distIndex) const;
	void renderStrip(uint16_t width);
	void renderMatrix(uint16_t width, uint16_t height, bool useVertical);

   public:
	WarpEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	bool isFullyOpaque() const;
};
