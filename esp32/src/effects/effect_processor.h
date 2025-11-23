#pragma once

#include "matrix.h"
#include "effects/pulse.h"
#include "effects/wipe.h"
#include "effects/explode.h"
#include "effects/test_leds.h"
#include "effects/effect.h"
#include <ArduinoJson.h>

/**
 * Effect Processor
 *
 * Manages continuous effect updates and rendering.
 * Handles frame timing and adding effects.
 */
class EffectProcessor {
   public:
	struct EffectEntry {
		const char* name;
		IEffect* effect;
	};

   private:
	Matrix& matrix;
	PulseEffect pulseEffect;
	WipeEffect wipeEffect;
	ExplodeEffect explodeEffect;
	TestLedsEffect testLedsEffect;
	unsigned long lastFrameTime;

	EffectEntry effectMap[4];

   public:
	EffectProcessor(Matrix& matrix);
	void update();
	void addEffect(const String& effectName, JsonDocument& props);
	void clearEffects();
};
