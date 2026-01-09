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
	enum class EnabledState : uint8_t { OFF, ON, FADE_IN, FADE_OUT };

	static constexpr float FADE_DURATION = 1.0f;  // 1 second

	struct BackgroundState {
		EnabledState enabledState;
		float fadeTime;
		CRGB gradientLut[GRADIENT_LUT_SIZE];
		bool isVertical;
	};

	BackgroundState state;
	Canvas& canvas;

	static EnabledState parseEnabledState(const char* str);
	uint8_t calculateAlpha() const;

   public:
	BackgroundEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
