#include "effect_processor.h"
#include "downsample_to_matrix.h"
#include "driver_config.h"
#include "effects/effect_utils.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix)
	: matrix(matrix),
	  pulseEffect(matrix),
	  wipeEffect(matrix),
	  explosionEffect(matrix),
	  testLedsEffect(matrix),
	  lastFrameTime(0),
	  effectMap{{"pulse", &pulseEffect}, {"wipe", &wipeEffect}, {"explosion", &explosionEffect}, {"test_leds", &testLedsEffect}} {}

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

	// Build array of active effects (excluding test effect)
	EffectEntry activeEffects[3];
	int activeCount = 0;
	for (const auto& entry : effectMap) {
		if (strcmp(entry.name, "test_leds") != 0) {
			activeEffects[activeCount++] = entry;
		}
	}

	// Composite only active effect canvases and downsample to matrix
	downsampleToMatrix(activeEffects, &matrix);

	// Display the frame
	// Note: FastLED.show() applies color correction, temperature, and gamma internally
	FastLED.show();
}

void EffectProcessor::addEffect(const String& effectName, JsonDocument& props) {
	// Validate common props before passing to effects

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
