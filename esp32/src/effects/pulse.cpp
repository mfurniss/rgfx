#include "pulse.h"
#include "effect_utils.h"
#include "canvas.h"
#include <algorithm>

static const uint32_t DEFAULT_COLOR = 0xFFFFFF;
static const float DEFAULT_DURATION = 1.0f;  // Duration in seconds
static const bool DEFAULT_FADE = true;

PulseEffect::PulseEffect(const Matrix& m) : matrix(m), canvas(m) {}

void PulseEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	// Duration comes in as milliseconds, convert to seconds
	uint32_t durationMs = props["duration"] | static_cast<uint32_t>(DEFAULT_DURATION * 1000);
	bool fade = props["fade"].is<bool>() ? props["fade"].as<bool>() : DEFAULT_FADE;
	const char* easingName = props["easing"] | "quadraticOut";

	Pulse newPulse;
	newPulse.r = (color >> 16) & 0xFF;
	newPulse.g = (color >> 8) & 0xFF;
	newPulse.b = color & 0xFF;
	newPulse.duration = durationMs / 1000.0f;  // Convert ms to seconds
	newPulse.fade = fade;
	newPulse.elapsedTime = 0.0f;
	newPulse.easing = getEasingFunction(easingName);
	pulses.push_back(newPulse);
}

void PulseEffect::update(float deltaTime) {
	for (auto p = pulses.begin(); p != pulses.end();) {
		p->elapsedTime += deltaTime;

		// Remove pulse when duration is complete
		if (p->elapsedTime >= p->duration) {
			p = pulses.erase(p);
		} else {
			++p;
		}
	}
}

void PulseEffect::render() {
	canvas.clear();

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	bool isStrip = (matrix.layoutType == LayoutType::STRIP);

	// Sort pulses by remaining duration (lowest first, highest rendered last)
	std::sort(pulses.begin(), pulses.end(),
	          [](const Pulse& a, const Pulse& b) { return a.remaining() < b.remaining(); });

	// Render pulses to canvas
	for (const auto& p : pulses) {
		float t = p.progress();
		float easedT = p.easing(t);

		// Calculate alpha based on fade mode
		uint8_t alpha;
		if (p.fade) {
			// Fading pulse: alpha decreases from 255 to 0
			alpha = static_cast<uint8_t>((1.0f - t) * 255.0f);
		} else {
			// Non-fading pulse: full brightness
			alpha = 255;
		}

		uint32_t color = RGBA(p.r, p.g, p.b, alpha / 2);

		if (isStrip) {
			// Strip: Contract from edges toward center horizontally
			uint16_t shrink = static_cast<uint16_t>(easedT * (width / 2));
			uint16_t startCol = shrink;
			uint16_t rectWidth = width - (shrink * 2);

			canvas.drawRectangle(startCol, 0, rectWidth, height, color, BlendMode::ALPHA);
		} else {
			// Matrix: Contract from top/bottom toward center vertically
			uint16_t shrink = static_cast<uint16_t>(easedT * (height / 2));
			uint16_t startRow = shrink;
			uint16_t rectHeight = height - (shrink * 2);

			canvas.drawRectangle(0, startRow, width, rectHeight, color, BlendMode::ALPHA);
		}
	}
}

void PulseEffect::reset() {
	pulses.clear();
}

Canvas& PulseEffect::getCanvas() {
	return canvas;
}
