#include "effect_processor.h"
#include "graphics/downsample_to_matrix.h"
#include "driver_config.h"
#include "effects/effect_utils.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix)
	: matrix(matrix),
	  canvas(matrix),
	  pulseEffect(matrix, canvas),
	  bitmapEffect(matrix, canvas),
	  wipeEffect(matrix, canvas),
	  explodeEffect(matrix, canvas),
	  testLedsEffect(matrix, canvas),
	  lastFrameTime(0),
	  effectMap{
		  {"pulse", &pulseEffect},     {"bitmap", &bitmapEffect},      {"wipe", &wipeEffect},
		  {"explode", &explodeEffect}, {"test_leds", &testLedsEffect},
	  } {}

void EffectProcessor::update() {
	unsigned long now = millis();

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
		FastLED.show();
		return;
	}

	// Normal mode: calculate delta time and update effects
	float deltaTime = (now - lastFrameTime) / 1000.0f;
	lastFrameTime = now;

	// Clear canvas once per frame
	canvas.clear();

	// Update and render all effects (excluding test effect)
	for (const auto& entry : effectMap) {
		if (strcmp(entry.name, "test_leds") != 0) {
			entry.effect->update(deltaTime);
			entry.effect->render();
		}
	}

	// Downsample shared canvas to matrix
	downsampleToMatrix(canvas, &matrix);

	// Display the frame
	FastLED.show();
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
			Serial.println("WARNING: 'color' prop wrong type (expected string), removing");
			props.remove("color");
		} else {
			const char* colorStr = props["color"];
			if (colorStr == nullptr) {
				Serial.println("WARNING: 'color' prop is null, removing");
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

	// Clear the matrix to black
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	FastLED.show();
}
