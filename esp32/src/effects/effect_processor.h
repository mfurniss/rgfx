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
#include "effects/plasma.h"
#include "effects/warp.h"
#include "effects/spectrum.h"
#include "effects/music.h"
#include "effects/particle_field.h"
#include "effects/sparkle.h"
#include "effects/particle_system.h"
#include "effects/effect.h"
#include "hal/display.h"
#include <ArduinoJson.h>

// Frame timing metrics (updated per-frame, averaged every second)
struct FrameTimingMetrics {
	uint32_t clearUs;       // Canvas clear time
	uint32_t effectsUs;     // All effects render + update
	uint32_t downsampleUs;  // Downsample to matrix
	uint32_t showUs;        // FastLED.show() time
	uint32_t totalUs;       // Total frame time
};

// Get averaged frame timing metrics (call from telemetry)
FrameTimingMetrics getFrameTimingMetrics();

// LED health status — false when RMT peripheral appears corrupted
bool getLedHealthy();

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
	ParticleSystem particleSystem;  // Shared particle system (must be declared before effects that use it)
	PulseEffect pulseEffect;
	BitmapEffect bitmapEffect;
	WipeEffect wipeEffect;
	ExplodeEffect explodeEffect;
	TestLedsEffect testLedsEffect;
	BackgroundEffect backgroundEffect;
	ProjectileEffect projectileEffect;
	TextEffect textEffect;
	ScrollTextEffect scrollTextEffect;
	PlasmaEffect plasmaEffect;
	WarpEffect warpEffect;
	SpectrumEffect spectrumEffect;
	MusicEffect musicEffect;
	ParticleFieldEffect particleFieldEffect;
	SparkleEffect sparkleEffect;
	uint32_t lastFrameTime;  // Microseconds for high-precision timing

	static constexpr size_t EFFECT_COUNT = 15;
	EffectEntry effectMap[EFFECT_COUNT];

   public:
	EffectProcessor(Matrix& matrix, hal::IDisplay& display);
	void update();
	void addEffect(const String& effectName, JsonDocument& props);
	void clearEffects();
};
