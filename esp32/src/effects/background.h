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
	struct BackgroundState {
		uint8_t r, g, b;
		bool enabled;
	};

	BackgroundState state;
	Canvas& canvas;

   public:
	BackgroundEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
