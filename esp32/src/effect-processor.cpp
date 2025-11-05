#include "effect-processor.h"
#include <FastLED.h>

EffectProcessor::EffectProcessor(Matrix& matrix) : matrix(matrix), lastFrameTime(0) {}

void EffectProcessor::update() {
	// Calculate delta time
	unsigned long now = millis();
	float deltaTime = (now - lastFrameTime) / 1000.0f;
	lastFrameTime = now;

	// Clear matrix before rendering effects
	fill_solid(matrix.leds, matrix.size, CRGB::Black);

	// Update and render pulse effect
	pulseEffect.update(deltaTime);
	pulseEffect.render(matrix);

	// Display the frame
	FastLED.show();
}

void EffectProcessor::triggerPulse(uint32_t color, uint32_t duration) {
	pulseEffect.addPulse(CRGB(color), duration);
}
