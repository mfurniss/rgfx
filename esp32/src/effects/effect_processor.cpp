#include "effect_processor.h"
#include "downsample_to_matrix.h"
#include "driver_config.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix)
	: matrix(matrix),
	  pulseEffect(matrix),
	  wipeEffect(matrix),
	  testLedsEffect(matrix),
	  lastFrameTime(0),
	  effectMap{{"pulse", &pulseEffect}, {"wipe", &wipeEffect}, {"test_leds", &testLedsEffect}} {}

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
		// Test mode: just render test pattern
		testLedsEffect.render();
		// Downsample and display test effect
		EffectEntry testEntry[1] = {{"test_leds", &testLedsEffect}};
		downsampleToMatrix(testEntry, &matrix);
		FastLED.show();
		return;
	}

	// Normal mode: calculate delta time and update effects
	float deltaTime = (now - lastFrameTime) / 1000.0f;
	lastFrameTime = now;

	// Update and render normal effects
	for (const auto& entry : effectMap) {
		if (strcmp(entry.name, "test_leds") != 0) {
			entry.effect->update(deltaTime);
			entry.effect->render();
		}
	}

	// Composite all effect canvases and downsample to matrix
	downsampleToMatrix(effectMap, &matrix);

	// Display the frame
	// Note: FastLED.show() applies color correction, temperature, and gamma internally
	FastLED.show();
}

void EffectProcessor::addEffect(const String& effectName, JsonDocument& props) {
	for (const auto& entry : effectMap) {
		if (effectName == entry.name) {
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
