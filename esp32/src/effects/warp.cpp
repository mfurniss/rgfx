#include "warp.h"
#include "gradient_utils.h"
#include "hal/types.h"
#include <cmath>

// Canvas uses 4x resolution
static constexpr uint16_t CANVAS_SCALE = 4;

WarpEffect::WarpEffect(const Matrix& m, Canvas& c)
	: state{0.0f, 1.0f, 0.0f, false, {}, {}, 0, 0.0f}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
	generateDefaultRainbowLut(state.gradientLut);
}

void WarpEffect::precomputeDistances(uint16_t physicalDimension) {
	if (physicalDimension > MAX_DIMENSION) {
		physicalDimension = MAX_DIMENSION;
	}

	float center = (physicalDimension - 1) / 2.0f;
	float maxDist = (center < 1.0f) ? 1.0f : center;

	// Linear exponent: scale 0 → exp 1 (linear), scale 3 → exp ~2
	float exponent = 1.0f + fabsf(state.scale) * 0.3f;

	for (uint16_t i = 0; i < physicalDimension; i++) {
		float normalizedDist = fabsf(static_cast<float>(i) - center) / maxDist;

		if (state.scale > 0.0f) {
			// Tunnel: wide bands at center, narrow at edges
			// Invert so center leads (colors flow center→edge with positive speed)
			state.scaledDist[i] = 1.0f - powf(normalizedDist, exponent);
		} else {
			// Bulge: narrow bands at center, wide at edges
			float distFromEdge = 1.0f - normalizedDist;
			state.scaledDist[i] = powf(distFromEdge, exponent);
		}
	}

	state.cachedDimension = physicalDimension;
	state.cachedScale = state.scale;
}

CRGB WarpEffect::getColorForDistance(uint16_t distIndex) const {
	float animatedPos = state.scaledDist[distIndex] - state.time;

	// Fast wrap to [0, 1) - avoid fmodf
	animatedPos -= static_cast<int>(animatedPos);
	if (animatedPos < 0.0f)
		animatedPos += 1.0f;

	uint8_t lutIndex = static_cast<uint8_t>(animatedPos * (GRADIENT_LUT_SIZE - 1));
	return state.gradientLut[lutIndex];
}

void WarpEffect::renderStrip(uint16_t canvasWidth) {
	uint8_t alpha = fade.currentAlpha;
	CRGB* pixels = canvas.getPixels();
	uint16_t physicalWidth = canvasWidth / CANVAS_SCALE;

	if (alpha == 255) {
		for (uint16_t led = 0; led < physicalWidth; led++) {
			CRGB color = getColorForDistance(led);
			// Fill all 4 canvas pixels for this physical LED
			uint16_t canvasX = led * CANVAS_SCALE;
			pixels[canvasX] = pixels[canvasX + 1] = pixels[canvasX + 2] = pixels[canvasX + 3] = color;
		}
	} else {
		uint8_t invAlpha = 255 - alpha;
		for (uint16_t led = 0; led < physicalWidth; led++) {
			CRGB color = getColorForDistance(led);
			uint16_t canvasX = led * CANVAS_SCALE;
			for (uint16_t i = 0; i < CANVAS_SCALE; i++) {
				CRGB& p = pixels[canvasX + i];
				p.r = (color.r * alpha + p.r * invAlpha) / 255;
				p.g = (color.g * alpha + p.g * invAlpha) / 255;
				p.b = (color.b * alpha + p.b * invAlpha) / 255;
			}
		}
	}
}

void WarpEffect::renderMatrix(uint16_t canvasWidth, uint16_t canvasHeight, bool useVertical) {
	uint8_t alpha = fade.currentAlpha;
	uint16_t physicalWidth = canvasWidth / CANVAS_SCALE;
	uint16_t physicalHeight = canvasHeight / CANVAS_SCALE;

	if (useVertical) {
		// Vertical radiation: gradient changes with Y (rows are uniform color)
		for (uint16_t ledY = 0; ledY < physicalHeight; ledY++) {
			CRGB color = getColorForDistance(ledY);
			uint16_t canvasY = ledY * CANVAS_SCALE;

			if (alpha == 255) {
				// Fill 4 rows of canvas pixels
				for (uint16_t dy = 0; dy < CANVAS_SCALE; dy++) {
					for (uint16_t x = 0; x < canvasWidth; x++) {
						canvas.drawPixel(x, canvasY + dy, color);
					}
				}
			} else {
				CRGBA blendColor(color, alpha);
				for (uint16_t dy = 0; dy < CANVAS_SCALE; dy++) {
					for (uint16_t x = 0; x < canvasWidth; x++) {
						canvas.drawPixel(x, canvasY + dy, blendColor, BlendMode::ALPHA);
					}
				}
			}
		}
	} else {
		// Horizontal radiation: gradient changes with X (columns are uniform color)
		for (uint16_t ledX = 0; ledX < physicalWidth; ledX++) {
			CRGB color = getColorForDistance(ledX);
			uint16_t canvasX = ledX * CANVAS_SCALE;

			if (alpha == 255) {
				// Fill 4 columns of canvas pixels
				for (uint16_t dx = 0; dx < CANVAS_SCALE; dx++) {
					for (uint16_t y = 0; y < canvasHeight; y++) {
						canvas.drawPixel(canvasX + dx, y, color);
					}
				}
			} else {
				CRGBA blendColor(color, alpha);
				for (uint16_t dx = 0; dx < CANVAS_SCALE; dx++) {
					for (uint16_t y = 0; y < canvasHeight; y++) {
						canvas.drawPixel(canvasX + dx, y, blendColor, BlendMode::ALPHA);
					}
				}
			}
		}
	}
}

void WarpEffect::add(JsonDocument& props) {
	EnabledState enabledState = fade.parseEnabledProp(props);

	// If turning off or fading out, just update fade state and return
	if (enabledState == EnabledState::OFF || enabledState == EnabledState::FADE_OUT) {
		fade.startFade(enabledState);
		return;
	}

	// Parse speed (positive=expand outward, negative=collapse inward), scaled down for smoother animation
	float speed = -(props["speed"] | 1.0f) * 0.3f;

	// Parse scale (0=linear, >0=tunnel perspective, <0=bulge perspective)
	float scale = props["scale"] | 0.0f;
	if (scale < -10.0f)
		scale = -10.0f;
	if (scale > 10.0f)
		scale = 10.0f;

	// Parse orientation ("vertical" or "horizontal", default horizontal)
	state.isVertical = false;
	if (!props["orientation"].isNull() && props["orientation"].is<const char*>()) {
		state.isVertical = strcmp(props["orientation"].as<const char*>(), "vertical") == 0;
	}

	// Parse gradient array using shared utility
	parseGradientFromJson(props, state.gradientLut);

	state.speed = speed;

	// Invalidate precomputed distances if scale changed
	if (scale != state.scale) {
		state.scale = scale;
		state.cachedDimension = 0;
	}

	fade.startFade(enabledState);
}

void WarpEffect::update(float deltaTime) {
	if (fade.isOff()) {
		return;
	}

	// Accumulate time based on speed
	state.time += deltaTime * state.speed;

	// Wrap at reasonable value to prevent float precision issues
	if (state.time > 100.0f)
		state.time -= 100.0f;
	if (state.time < -100.0f)
		state.time += 100.0f;

	fade.updateFade(deltaTime);
}

void WarpEffect::render() {
	if (fade.isOff() || fade.currentAlpha == 0) {
		return;
	}

	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	// For strips (height=1), always use horizontal orientation
	bool useVertical = state.isVertical && canvasHeight > 1;

	// Work with physical LED dimensions (canvas is 4x upscaled)
	uint16_t physicalDim = useVertical ? (canvasHeight / CANVAS_SCALE) : (canvasWidth / CANVAS_SCALE);

	// Recompute distances if dimension or scale changed
	if (state.cachedDimension != physicalDim || state.cachedScale != state.scale) {
		precomputeDistances(physicalDim);
	}

	if (canvasHeight == 1) {
		renderStrip(canvasWidth);
	} else {
		renderMatrix(canvasWidth, canvasHeight, useVertical);
	}
}

void WarpEffect::reset() {
	fade = FadeState{};
	state.time = 0.0f;
	state.speed = 1.0f;
	state.scale = 0.0f;
	state.isVertical = false;
	state.cachedDimension = 0;
	state.cachedScale = 0.0f;
	generateDefaultRainbowLut(state.gradientLut);
}

bool WarpEffect::isFullyOpaque() const {
	return fade.isFullyOpaque();
}
