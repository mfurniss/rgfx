#include "effect-processor.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix)
	: matrix(matrix), lastFrameTime(0), effectMap{{"pulse", &pulseEffect}, {"wipe", &wipeEffect}} {}

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

	// Clear matrix before rendering effects
	fill_solid(matrix.leds, matrix.size, CRGB::Black);

	// Update and render all effects
	for (const auto& entry : effectMap) {
		entry.effect->update(deltaTime);
		entry.effect->render(matrix);
	}

	// Display the frame
	FastLED.show();
}

void EffectProcessor::trigger(const String& effectName, JsonDocument& props) {
	for (const auto& entry : effectMap) {
		if (effectName == entry.name) {
			entry.effect->add(props);
			return;
		}
	}
}

void EffectProcessor::clearEffects() {
	pulseEffect.reset();
	wipeEffect.reset();
}
