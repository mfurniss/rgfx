#include "effect_processor.h"
#include "downsample_to_matrix.h"
#include "driver_config.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix)
	: matrix(matrix),
	  pulseEffect(matrix),
	  wipeEffect(matrix),
	  lastFrameTime(0),
	  effectMap{{"pulse", &pulseEffect}, {"wipe", &wipeEffect}} {}

void EffectProcessor::update() {
	unsigned long now = millis();

	// First frame: initialize timing, skip rendering
	if (lastFrameTime == 0) {
		lastFrameTime = now;
		return;
	}

	// Calculate delta time for subsequent frames
	float deltaTime = (now - lastFrameTime) / 1000.0f;
	lastFrameTime = now;

	// Update and render all effects to their canvases
	for (const auto& entry : effectMap) {
		entry.effect->update(deltaTime);
		entry.effect->render();
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
}
