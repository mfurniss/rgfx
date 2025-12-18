#include "effect_processor.h"
#include "graphics/downsample_to_matrix.h"
#include "driver_config.h"
#include "effects/effect_utils.h"
#include "hal/platform.h"

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
	  lastFrameTime(0),
	  effectMap{
		  {"pulse", &pulseEffect},           {"bitmap", &bitmapEffect},
		  {"wipe", &wipeEffect},             {"explode", &explodeEffect},
		  {"test_leds", &testLedsEffect},    {"background", &backgroundEffect},
		  {"projectile", &projectileEffect}, {"text", &textEffect},
		  {"scroll_text", &scrollTextEffect}, {"plasma", &plasmaEffect},
	  } {}

void EffectProcessor::update() {
	uint32_t now = hal::micros();

	// First frame: initialize timing, skip rendering
	if (lastFrameTime == 0) {
		lastFrameTime = now;
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
		lastFrameTime = now;
		return;
	}

	// Normal mode: calculate delta time with microsecond precision
	float deltaTime = (now - lastFrameTime) / 1000000.0f;
	lastFrameTime = now;

	// Clear canvas once per frame
	canvas.clear();

	// Render background FIRST (no update needed - static effect)
	backgroundEffect.render();

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

	// Downsample shared canvas to matrix
	downsampleToMatrix(canvas, &matrix);

	// Display the frame
	display.show(matrix.leds, matrix.size, matrix.width, matrix.height);
}

void EffectProcessor::addEffect(const String& effectName, JsonDocument& props) {
	// Check for reset flag (common to all effects)
	bool shouldReset = false;
	if (!props["reset"].isNull() && props["reset"].is<bool>()) {
		shouldReset = props["reset"].as<bool>();
	}

	// Validate color prop (common to all effects)
	if (!props["color"].isNull()) {
		if (!props["color"].is<const char*>()) {
			hal::log("WARNING: 'color' prop wrong type (expected string), removing");
			props.remove("color");
		} else {
			const char* colorStr = props["color"];
			if (colorStr == nullptr) {
				hal::log("WARNING: 'color' prop is null, removing");
				props.remove("color");
			}
		}
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
