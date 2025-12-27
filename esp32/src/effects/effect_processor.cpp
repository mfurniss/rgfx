#include "effect_processor.h"
#include "graphics/downsample_to_matrix.h"
#include "driver_config.h"
#include "effects/effect_utils.h"
#include "hal/platform.h"

// Frame timing accumulator (reset every second when FPS is calculated)
static uint32_t g_clearUsAccum = 0;
static uint32_t g_effectsUsAccum = 0;
static uint32_t g_downsampleUsAccum = 0;
static uint32_t g_showUsAccum = 0;
static uint32_t g_totalUsAccum = 0;
static uint32_t g_timingFrameCount = 0;
static uint32_t g_lastTimingCalcTime = 0;

// Averaged metrics (updated once per second)
static FrameTimingMetrics g_avgMetrics = {0, 0, 0, 0, 0};

FrameTimingMetrics getFrameTimingMetrics() {
	return g_avgMetrics;
}

EffectProcessor::EffectProcessor(Matrix& matrix, hal::IDisplay& display)
	: matrix(matrix),
	  display(display),
	  canvas(matrix),
	  pulseEffect(matrix, canvas),
	  bitmapEffect(matrix, canvas),
	  wipeEffect(matrix, canvas),
	  explodeEffect(matrix, canvas),
	  testLedsEffect(matrix, canvas),
	  backgroundEffect(matrix, canvas),
	  projectileEffect(matrix, canvas),
	  textEffect(matrix, canvas),
	  scrollTextEffect(matrix, canvas),
	  plasmaEffect(matrix, canvas),
	  spectrumEffect(matrix, canvas),
	  particleFieldEffect(matrix, canvas),
	  lastFrameTime(0),
	  effectMap{
		  {"particle_field", &particleFieldEffect},
		  {"pulse", &pulseEffect},
		  {"bitmap", &bitmapEffect},
		  {"wipe", &wipeEffect},
		  {"explode", &explodeEffect},
		  {"test_leds", &testLedsEffect},
		  {"background", &backgroundEffect},
		  {"projectile", &projectileEffect},
		  {"text", &textEffect},
		  {"scroll_text", &scrollTextEffect},
		  {"plasma", &plasmaEffect},
		  {"spectrum", &spectrumEffect},
	  } {}

void EffectProcessor::update() {
	uint32_t frameStart = hal::micros();

	// First frame: initialize timing, skip rendering
	if (lastFrameTime == 0) {
		lastFrameTime = frameStart;
		g_lastTimingCalcTime = hal::millis();
		return;
	}

	// Check if in test mode FIRST
	extern bool testModeActive;
	if (testModeActive) {
		// Test mode: clear canvas and render test pattern
		canvas.clear();
		testLedsEffect.render();
		downsampleToMatrix(canvas, &matrix);
		display.show(matrix.leds, matrix.size, matrix.width, matrix.height);
		lastFrameTime = frameStart;
		return;
	}

	// Normal mode: calculate delta time with microsecond precision
	float deltaTime = (frameStart - lastFrameTime) / 1000000.0f;
	lastFrameTime = frameStart;

	// --- TIMING: Canvas clear ---
	uint32_t t0 = hal::micros();
	canvas.clear();
	uint32_t t1 = hal::micros();

	// Skip background if plasma is fully opaque (optimization)
	if (!plasmaEffect.isFullyOpaque()) {
		backgroundEffect.render();
	}
	backgroundEffect.update(deltaTime);

	// Render plasma SECOND (on top of background, below other effects)
	plasmaEffect.render();
	plasmaEffect.update(deltaTime);

	// Render then update all other effects (excluding test, background, and plasma)
	// Render first so initial state is visible on the frame the effect is added
	for (const auto& entry : effectMap) {
		if (strcmp(entry.name, "test_leds") != 0 && strcmp(entry.name, "background") != 0 &&
		    strcmp(entry.name, "plasma") != 0) {
			entry.effect->render();
			entry.effect->update(deltaTime);
		}
	}
	uint32_t t2 = hal::micros();

	// --- TIMING: Downsample ---
	downsampleToMatrix(canvas, &matrix);
	uint32_t t3 = hal::micros();

	// --- TIMING: Display ---
	display.show(matrix.leds, matrix.size, matrix.width, matrix.height);
	uint32_t t4 = hal::micros();

	// Accumulate timing data
	g_clearUsAccum += (t1 - t0);
	g_effectsUsAccum += (t2 - t1);
	g_downsampleUsAccum += (t3 - t2);
	g_showUsAccum += (t4 - t3);
	g_totalUsAccum += (t4 - frameStart);
	g_timingFrameCount++;

	// Calculate averages every second
	uint32_t nowMs = hal::millis();
	if (nowMs - g_lastTimingCalcTime >= 1000 && g_timingFrameCount > 0) {
		g_avgMetrics.clearUs = g_clearUsAccum / g_timingFrameCount;
		g_avgMetrics.effectsUs = g_effectsUsAccum / g_timingFrameCount;
		g_avgMetrics.downsampleUs = g_downsampleUsAccum / g_timingFrameCount;
		g_avgMetrics.showUs = g_showUsAccum / g_timingFrameCount;
		g_avgMetrics.totalUs = g_totalUsAccum / g_timingFrameCount;

		// Reset accumulators
		g_clearUsAccum = 0;
		g_effectsUsAccum = 0;
		g_downsampleUsAccum = 0;
		g_showUsAccum = 0;
		g_totalUsAccum = 0;
		g_timingFrameCount = 0;
		g_lastTimingCalcTime = nowMs;
	}
}

void EffectProcessor::addEffect(const String& effectName, JsonDocument& props) {
	// Check for reset flag (common to all effects)
	bool shouldReset = false;
	if (!props["reset"].isNull() && props["reset"].is<bool>()) {
		shouldReset = props["reset"].as<bool>();
	}

	// Route to the appropriate effect
	for (const auto& entry : effectMap) {
		if (effectName == entry.name) {
			if (shouldReset) {
				entry.effect->reset();
			}
			entry.effect->add(props);
			return;
		}
	}
}

void EffectProcessor::clearEffects() {
	for (const auto& entry : effectMap) {
		entry.effect->reset();
	}

	// Clear the canvas (prevents re-render showing old state)
	canvas.clear();

	// Clear the matrix to black and display immediately
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	display.show(matrix.leds, matrix.size, matrix.width, matrix.height);
}
