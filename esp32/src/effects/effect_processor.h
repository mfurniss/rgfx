#pragma once

#include "graphics/matrix.h"
#include "graphics/canvas.h"
#include "effects/pulse.h"
#include "effects/bitmap.h"
#include "effects/wipe.h"
#include "effects/explode.h"
#include "effects/test_leds.h"
#include "effects/background.h"
#include "effects/effect.h"
#include <ArduinoJson.h>

/**
 * Effect Processor
 *
 * Manages continuous effect updates and rendering.
 * Handles frame timing and adding effects.
 * Owns the shared canvas used by all effects.
 */
class EffectProcessor {
   public:
	struct EffectEntry {
		const char* name;
		IEffect* effect;
	};

   private:
	Matrix& matrix;
	Canvas canvas;  // Single shared canvas (must be declared before effects)
	PulseEffect pulseEffect;
	BitmapEffect bitmapEffect;
	WipeEffect wipeEffect;
	ExplodeEffect explodeEffect;
	TestLedsEffect testLedsEffect;
	BackgroundEffect backgroundEffect;
	unsigned long lastFrameTime;

	EffectEntry effectMap[6];

   public:
	EffectProcessor(Matrix& matrix);
	void update();
	void addEffect(const String& effectName, JsonDocument& props);
	void clearEffects();
};
