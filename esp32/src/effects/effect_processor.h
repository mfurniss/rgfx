#pragma once

#include "graphics/matrix.h"
#include "graphics/canvas.h"
#include "effects/pulse.h"
#include "effects/bitmap.h"
#include "effects/wipe.h"
#include "effects/explode.h"
#include "effects/test_leds.h"
#include "effects/background.h"
#include "effects/projectile.h"
#include "effects/text.h"
#include "effects/scroll_text.h"
#include "effects/effect.h"
#include "hal/display.h"
#include <ArduinoJson.h>

/**
 * Effect Processor
 *
 * Manages continuous effect updates and rendering.
 * Handles frame timing and adding effects.
 * Owns the shared canvas used by all effects.
 *
 * Uses dependency injection for the display backend, enabling:
 * - FastLED output on ESP32
 * - Raylib window on native (LED simulator)
 * - Headless capture for unit tests
 */
class EffectProcessor {
   public:
	struct EffectEntry {
		const char* name;
		IEffect* effect;
	};

   private:
	Matrix& matrix;
	hal::IDisplay& display;	 // Injected display backend
	Canvas canvas;			 // Single shared canvas (must be declared before effects)
	PulseEffect pulseEffect;
	BitmapEffect bitmapEffect;
	WipeEffect wipeEffect;
	ExplodeEffect explodeEffect;
	TestLedsEffect testLedsEffect;
	BackgroundEffect backgroundEffect;
	ProjectileEffect projectileEffect;
	TextEffect textEffect;
	ScrollTextEffect scrollTextEffect;
	uint32_t lastFrameTime;  // Microseconds for high-precision timing

	EffectEntry effectMap[9];

   public:
	EffectProcessor(Matrix& matrix, hal::IDisplay& display);
	void update();
	void addEffect(const String& effectName, JsonDocument& props);
	void clearEffects();
};
