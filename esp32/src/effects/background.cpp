#include "background.h"
#include "effect_utils.h"
#include "graphics/canvas.h"

static const uint32_t DEFAULT_COLOR = 0x000000;  // Black default

BackgroundEffect::BackgroundEffect(const Matrix& m, Canvas& c)
	: state{0, 0, 0, false}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

void BackgroundEffect::add(JsonDocument& props) {
	// Parse enabled flag (default to true if not specified)
	bool enabled = true;
	if (!props["enabled"].isNull() && props["enabled"].is<bool>()) {
		enabled = props["enabled"].as<bool>();
	}

	// If disabling, just set enabled false and return (color not needed)
	if (!enabled) {
		state.enabled = false;
		return;
	}

	// Parse color (use default black if not provided)
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;

	// Replace state (singleton behavior)
	state.r = (color >> 16) & 0xFF;
	state.g = (color >> 8) & 0xFF;
	state.b = color & 0xFF;
	state.enabled = enabled;
}

void BackgroundEffect::update(float deltaTime) {
	// No animation - background is static
	(void)deltaTime;
}

void BackgroundEffect::render() {
	if (!state.enabled) {
		return;
	}

	// Fill entire canvas with solid color
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	CRGB color(state.r, state.g, state.b);
	canvas.drawRectangle(0, 0, width, height, color);
}

void BackgroundEffect::reset() {
	state.enabled = false;
	state.r = 0;
	state.g = 0;
	state.b = 0;
}
