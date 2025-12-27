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
 *   5 = Projectile
 *   6 = Plasma (toggle)
 *   7 = Spectrum analyzer
 *
 * @param processor Effect processor to add effects to
 * @param effectType Effect type (1-7)
 */
void triggerDemoEffect(EffectProcessor& processor, int effectType);

/**
 * Update continuous spectrum demo animation.
 * Sends animated FFT-like values to the spectrum effect.
 *
 * @param processor Effect processor to add effects to
 * @param deltaTime Time since last frame in seconds
 * @param enabled Whether spectrum demo mode is active
 */
void updateSpectrumDemo(EffectProcessor& processor, float deltaTime, bool enabled);
