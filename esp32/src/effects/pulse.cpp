#include "pulse.h"
#include "effect_utils.h"
#include "generated/effect_defaults.h"
#include "hal/platform.h"
#include "graphics/canvas.h"
#include "network/mqtt.h"
#include <algorithm>
#include <cstring>

PulseEffect::PulseEffect(Canvas& c) : canvas(c) {}

void PulseEffect::add(JsonDocument& props) {
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: pulse missing or invalid 'color' prop");
		publishError("pulse", "missing or invalid 'color' prop", props);
		return;
	}
	uint32_t color = parseColor(props["color"]);
	uint32_t durationMs = props["duration"] | effect_defaults::pulse::duration;
	bool fade = props["fade"] | effect_defaults::pulse::fade;
	const char* easingName = props["easing"] | effect_defaults::pulse::easing;
	const char* collapseStr = props["collapse"] | effect_defaults::pulse::collapse;

	CollapseMode collapse;
	if (strcmp(collapseStr, "random") == 0) {
		collapse = (hal::random(2) == 0) ? CollapseMode::Horizontal : CollapseMode::Vertical;
	} else if (strcmp(collapseStr, "vertical") == 0) {
		collapse = CollapseMode::Vertical;
	} else if (strcmp(collapseStr, "none") == 0) {
		collapse = CollapseMode::None;
	} else {
		collapse = CollapseMode::Horizontal;
	}

	Pulse newPulse;
	newPulse.color = RGBColor(color);
	newPulse.duration = durationMs / 1000.0f;  // Convert ms to seconds
	newPulse.fade = fade;
	newPulse.collapse = collapse;
	newPulse.elapsedTime = 0.0f;
	newPulse.easing = getEasingFunction(easingName);

	pulses.add(newPulse);
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
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

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

		CRGBA color(p.color.r, p.color.g, p.color.b, alpha);

		uint16_t startCol = 0;
		uint16_t startRow = 0;
		uint16_t rectWidth = width;
		uint16_t rectHeight = height;

		if (p.collapse == CollapseMode::Horizontal && height > 1) {
			// Shrink height from top/bottom toward center
			uint16_t shrink = static_cast<uint16_t>(easedT * (height / 2));
			startRow = shrink;
			rectHeight = height - (shrink * 2);
		} else if (p.collapse == CollapseMode::Vertical ||
		           (p.collapse == CollapseMode::Horizontal && height == 1)) {
			// Shrink width from left/right toward center
			// For 1D strips (height=1), horizontal and vertical behave the same
			uint16_t shrink = static_cast<uint16_t>(easedT * (width / 2));
			startCol = shrink;
			rectWidth = width - (shrink * 2);
		}
		// CollapseMode::None: full canvas, no shrinking

		canvas.drawRectangle(startCol, startRow, rectWidth, rectHeight, color);
	}
}

void PulseEffect::reset() {
	pulses.clear();
}
