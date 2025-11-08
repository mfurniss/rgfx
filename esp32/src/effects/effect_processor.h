#pragma once

#include "matrix.h"
#include "effects/pulse.h"
#include "effects/wipe.h"
#include "effects/effect.h"
#include <ArduinoJson.h>

/**
 * Effect Processor
 *
 * Manages continuous effect updates and rendering.
 * Handles frame timing and adding effects.
 */
class EffectProcessor {
   private:
	struct EffectEntry {
		const char* name;
		IEffect* effect;
	};

	Matrix& matrix;
	PulseEffect pulseEffect;
	WipeEffect wipeEffect;
	unsigned long lastFrameTime;

	EffectEntry effectMap[2];

   public:
	EffectProcessor(Matrix& matrix);
	void update();
	void addEffect(const String& effectName, JsonDocument& props);
	void clearEffects();
};
