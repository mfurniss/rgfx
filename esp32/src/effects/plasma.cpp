#include "plasma.h"
#include "hal/types.h"
#include <cmath>

static const float DEFAULT_SCALE = 3.0f;
static const float DEFAULT_SPEED = 2.0f;
static const float DEFAULT_COLOR_SHIFT = 0.0f;

PlasmaEffect::PlasmaEffect(const Matrix& m, Canvas& c)
	: state{0.0f, DEFAULT_SCALE, DEFAULT_SPEED, DEFAULT_COLOR_SHIFT, false}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

void PlasmaEffect::add(JsonDocument& props) {
	// Parse enabled flag (default to true if not specified)
	bool enabled = true;
	if (!props["enabled"].isNull() && props["enabled"].is<bool>()) {
		enabled = props["enabled"].as<bool>();
	}

	// If disabling, just set enabled false and return
	if (!enabled) {
		state.enabled = false;
		return;
	}

	// Parse scale (0.1-10.0, default 2.0)
	float scale = DEFAULT_SCALE;
	if (!props["scale"].isNull()) {
		scale = props["scale"].as<float>();
		if (scale < 0.1f) scale = 0.1f;
		if (scale > 10.0f) scale = 10.0f;
	}

	// Parse speed
	float speed = DEFAULT_SPEED;
	if (!props["speed"].isNull()) {
		speed = props["speed"].as<float>();
	}

	// Parse colorShift (-128 to 128)
	float colorShift = DEFAULT_COLOR_SHIFT;
	if (!props["colorShift"].isNull()) {
		colorShift = props["colorShift"].as<float>();
		if (colorShift < -128.0f) colorShift = -128.0f;
		if (colorShift > 128.0f) colorShift = 128.0f;
	}

	state.scale = scale;
	state.speed = speed;
	state.colorShift = colorShift;
	state.enabled = enabled;
}

void PlasmaEffect::update(float deltaTime) {
	if (!state.enabled) {
		return;
	}

	// Simple time accumulation
	state.time += deltaTime * state.speed;

	// Wrap at a reasonable value to prevent float precision issues
	if (state.time > 1000.0f) {
		state.time -= 1000.0f;
	}
}

void PlasmaEffect::render() {
	if (!state.enabled) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Scale controls noise frequency - multiply coords before passing to noise
	uint16_t noiseScale = (uint16_t)(state.scale * 3.0f);
	// Time offset for animation - third dimension of noise field
	uint16_t timeOffset = (uint16_t)(state.time * 100.0f);

	constexpr uint16_t step = 4;

	// Hue offset rotates the palette over time for full color coverage
	// colorShift adds a static offset to the entire palette
	int16_t hueOffset = (int16_t)(state.time * 20.0f) + (int16_t)state.colorShift;

	for (uint16_t y = 0; y < height; y += step) {
		for (uint16_t x = 0; x < width; x += step) {
			// 3D Perlin noise: x, y for position, time for animation
			uint8_t noise = inoise8(x * noiseScale, y * noiseScale, timeOffset);

			CRGB color = CHSV((uint8_t)(noise + hueOffset), 255, 255);
			canvas.drawRectangle(x, y, step, step, color);
		}
	}
}

void PlasmaEffect::reset() {
	state.enabled = false;
	state.time = 0.0f;
	state.scale = DEFAULT_SCALE;
	state.speed = DEFAULT_SPEED;
	state.colorShift = DEFAULT_COLOR_SHIFT;
}
