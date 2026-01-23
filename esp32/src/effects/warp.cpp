#include "warp.h"
#include "gradient_utils.h"
#include "hal/types.h"
#include <cmath>
#include <cstring>

WarpEffect::WarpEffect(const Matrix& m, Canvas& c)
	: state{0.0f, 1.0f, 0.0f, false, EnabledState::OFF, 0.0f, 0, {}}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut(state.gradientLut);
}

WarpEffect::EnabledState WarpEffect::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0)
		return EnabledState::OFF;
	if (strcmp(str, "on") == 0)
		return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0)
		return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0)
		return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

void WarpEffect::updateAlpha() {
	switch (state.enabledState) {
		case EnabledState::OFF:
			state.currentAlpha = 0;
			break;
		case EnabledState::ON:
			state.currentAlpha = 255;
			break;
		case EnabledState::FADE_IN: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f)
				progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>(progress * 255.0f);
			break;
		}
		case EnabledState::FADE_OUT: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f)
				progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>((1.0f - progress) * 255.0f);
			break;
		}
	}
}

void WarpEffect::add(JsonDocument& props) {
	// Parse enabled - support both string and bool for backwards compat
	EnabledState enabledState = EnabledState::ON;
	if (!props["enabled"].isNull()) {
		if (props["enabled"].is<bool>()) {
			enabledState = props["enabled"].as<bool>() ? EnabledState::ON : EnabledState::OFF;
		} else if (props["enabled"].is<const char*>()) {
			enabledState = parseEnabledState(props["enabled"].as<const char*>());
		}
	}

	// If turning off instantly, just set state and return
	if (enabledState == EnabledState::OFF) {
		state.enabledState = EnabledState::OFF;
		state.currentAlpha = 0;
		return;
	}

	// Handle fadeOut - preserve existing state, just fade
	if (enabledState == EnabledState::FADE_OUT) {
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
		state.enabledState = EnabledState::FADE_OUT;
		return;
	}

	// Parse speed (can be negative for collapsing warp), scaled down for smoother animation
	float speed = (props["speed"] | 1.0f) * 0.3f;

	// Parse scale (0=linear, >0=compresses edges/3D tunnel, <0=compresses center), scaled down
	float scale = (props["scale"] | 0.0f) * 0.25f;
	if (scale < -1.25f)
		scale = -1.25f;
	if (scale > 1.25f)
		scale = 1.25f;

	// Parse orientation ("vertical" or "horizontal", default horizontal)
	state.isVertical = false;
	if (!props["orientation"].isNull() && props["orientation"].is<const char*>()) {
		state.isVertical = strcmp(props["orientation"].as<const char*>(), "vertical") == 0;
	}

	// Parse gradient array using shared utility
	parseGradientFromJson(props, state.gradientLut);

	state.speed = speed;
	state.scale = scale;

	// For fades, calculate starting fadeTime based on current alpha
	if (enabledState == EnabledState::FADE_IN) {
		state.fadeTime = (state.currentAlpha / 255.0f) * FADE_DURATION;
	} else if (enabledState == EnabledState::FADE_OUT) {
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
	} else {
		state.fadeTime = 0.0f;
		state.currentAlpha = (enabledState == EnabledState::ON) ? 255 : 0;
	}

	state.enabledState = enabledState;
}

void WarpEffect::update(float deltaTime) {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	// Accumulate time based on speed
	state.time += deltaTime * state.speed;

	// Wrap at reasonable value to prevent float precision issues
	if (state.time > 100.0f)
		state.time -= 100.0f;
	if (state.time < -100.0f)
		state.time += 100.0f;

	// Handle fade transitions
	if (state.enabledState == EnabledState::FADE_IN ||
	    state.enabledState == EnabledState::FADE_OUT) {
		state.fadeTime += deltaTime;

		if (state.fadeTime >= FADE_DURATION) {
			state.enabledState = (state.enabledState == EnabledState::FADE_IN) ? EnabledState::ON
			                                                                   : EnabledState::OFF;
			state.fadeTime = 0.0f;
		}

		updateAlpha();
	}
}

void WarpEffect::render() {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	uint8_t alpha = state.currentAlpha;
	if (alpha == 0) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();

	// Calculate center position
	float centerX = (width - 1) / 2.0f;
	float centerY = (height - 1) / 2.0f;

	// For strips (height=1), always use horizontal orientation
	bool useVertical = state.isVertical && height > 1;

	// Maximum distance from center (used for normalization)
	float maxDist = useVertical ? centerY : centerX;
	if (maxDist < 1.0f)
		maxDist = 1.0f;  // Prevent division by zero

	uint8_t invAlpha = 255 - alpha;

	// Strip layout: height=1, render horizontal gradient from center
	if (height == 1) {
		CRGB* pixels = canvas.getPixels();
		for (uint16_t x = 0; x < width; x++) {
			float distFromCenter = fabsf(static_cast<float>(x) - centerX);
			float normalizedDist = distFromCenter / maxDist;

			// Apply perspective scaling: scale=0 linear, >0 compresses edges (3D tunnel), <0
			// compresses center
			float scaledDist;
			if (state.scale > 0.0f) {
				// Positive: compress edges by applying power to distance-from-edge
				float exponent = powf(2.0f, state.scale);
				float distFromEdge = 1.0f - normalizedDist;
				scaledDist = 1.0f - powf(distFromEdge, exponent);
			} else {
				float exponent = powf(2.0f, -state.scale);
				scaledDist = powf(normalizedDist, exponent);
			}
			float animatedPos = scaledDist - state.time;

			// Wrap to [0, 1)
			animatedPos = fmodf(animatedPos, 1.0f);
			if (animatedPos < 0.0f)
				animatedPos += 1.0f;

			// Map to LUT
			uint8_t lutIndex = static_cast<uint8_t>(animatedPos * (GRADIENT_LUT_SIZE - 1));
			CRGB color = state.gradientLut[lutIndex];

			// Alpha blend
			if (alpha < 255) {
				CRGB& p = pixels[x];
				p.r = (color.r * alpha + p.r * invAlpha) / 255;
				p.g = (color.g * alpha + p.g * invAlpha) / 255;
				p.b = (color.b * alpha + p.b * invAlpha) / 255;
			} else {
				pixels[x] = color;
			}
		}
		return;
	}

	// Matrix layout: render strips perpendicular to radiation direction
	if (useVertical) {
		// Vertical radiation: gradient changes with Y (rows are uniform color)
		for (uint16_t y = 0; y < height; y++) {
			float distFromCenter = fabsf(static_cast<float>(y) - centerY);
			float normalizedDist = distFromCenter / maxDist;
			float scaledDist;
			if (state.scale > 0.0f) {
				float exponent = powf(2.0f, state.scale);
				float distFromEdge = 1.0f - normalizedDist;
				scaledDist = 1.0f - powf(distFromEdge, exponent);
			} else {
				float exponent = powf(2.0f, -state.scale);
				scaledDist = powf(normalizedDist, exponent);
			}
			float animatedPos = scaledDist - state.time;

			animatedPos = fmodf(animatedPos, 1.0f);
			if (animatedPos < 0.0f)
				animatedPos += 1.0f;

			uint8_t lutIndex = static_cast<uint8_t>(animatedPos * (GRADIENT_LUT_SIZE - 1));
			CRGB color = state.gradientLut[lutIndex];

			// Draw entire horizontal row with this color
			for (uint16_t x = 0; x < width; x++) {
				if (alpha < 255) {
					CRGB existing = canvas.getPixel(x, y);
					CRGB blended((color.r * alpha + existing.r * invAlpha) / 255,
					             (color.g * alpha + existing.g * invAlpha) / 255,
					             (color.b * alpha + existing.b * invAlpha) / 255);
					canvas.drawPixel(x, y, blended);
				} else {
					canvas.drawPixel(x, y, color);
				}
			}
		}
	} else {
		// Horizontal radiation: gradient changes with X (columns are uniform color)
		for (uint16_t x = 0; x < width; x++) {
			float distFromCenter = fabsf(static_cast<float>(x) - centerX);
			float normalizedDist = distFromCenter / maxDist;
			float scaledDist;
			if (state.scale > 0.0f) {
				float exponent = powf(2.0f, state.scale);
				float distFromEdge = 1.0f - normalizedDist;
				scaledDist = 1.0f - powf(distFromEdge, exponent);
			} else {
				float exponent = powf(2.0f, -state.scale);
				scaledDist = powf(normalizedDist, exponent);
			}
			float animatedPos = scaledDist - state.time;

			animatedPos = fmodf(animatedPos, 1.0f);
			if (animatedPos < 0.0f)
				animatedPos += 1.0f;

			uint8_t lutIndex = static_cast<uint8_t>(animatedPos * (GRADIENT_LUT_SIZE - 1));
			CRGB color = state.gradientLut[lutIndex];

			// Draw entire vertical column with this color
			for (uint16_t y = 0; y < height; y++) {
				if (alpha < 255) {
					CRGB existing = canvas.getPixel(x, y);
					CRGB blended((color.r * alpha + existing.r * invAlpha) / 255,
					             (color.g * alpha + existing.g * invAlpha) / 255,
					             (color.b * alpha + existing.b * invAlpha) / 255);
					canvas.drawPixel(x, y, blended);
				} else {
					canvas.drawPixel(x, y, color);
				}
			}
		}
	}
}

void WarpEffect::reset() {
	state.enabledState = EnabledState::OFF;
	state.time = 0.0f;
	state.speed = 1.0f;
	state.scale = 0.0f;
	state.isVertical = false;
	state.fadeTime = 0.0f;
	state.currentAlpha = 0;
	generateDefaultRainbowLut(state.gradientLut);
}

bool WarpEffect::isFullyOpaque() const {
	return state.currentAlpha == 255;
}
