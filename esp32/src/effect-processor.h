#pragma once

#include "matrix.h"
#include "effects/pulse.h"
#include "effects/wipe.h"

/**
 * Effect Processor
 *
 * Manages continuous effect updates and rendering.
 * Handles frame timing and effect triggering.
 */
class EffectProcessor {
  private:
	Matrix& matrix;
	PulseEffect pulseEffect;
	WipeEffect wipeEffect;
	unsigned long lastFrameTime;

  public:
	EffectProcessor(Matrix& matrix);
	void update();
	void triggerPulse(uint32_t color, uint32_t duration, bool fade = true);
	void triggerWipe(uint32_t color, uint32_t duration, bool fade = true);
};
