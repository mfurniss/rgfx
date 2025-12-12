/**
 * Demo Effects
 *
 * Triggers demo effects for testing.
 */
#pragma once

#include "effects/effect_processor.h"

/**
 * Trigger a demo effect by number.
 *
 * Effect types:
 *   1 = Pulse
 *   2 = Wipe
 *   3 = Explode
 *   4 = Background (random color or disabled)
 *
 * @param processor Effect processor to add effects to
 * @param effectType Effect type (1-4)
 */
void triggerDemoEffect(EffectProcessor& processor, int effectType);
