#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

/**
 * Background Effect
 *
 * Singleton solid color background that fills the entire canvas.
 * New calls to add() replace the previous background state.
 * Renders FIRST, before all other effects, so other effects composite on top.
 */
class BackgroundEffect : public IEffect {
   private:
	enum class EnabledState : uint8_t { OFF, ON, FADE_IN, FADE_OUT };

	static constexpr float FADE_DURATION = 1.0f;  // 1 second

	struct BackgroundState {
		uint8_t r, g, b;
		EnabledState enabledState;
		float fadeTime;
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
