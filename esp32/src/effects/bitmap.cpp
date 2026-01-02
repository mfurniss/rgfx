#include "bitmap.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "graphics/canvas.h"
#include "network/mqtt.h"
#include <algorithm>
#include <cmath>

BitmapEffect::BitmapEffect(const Matrix& m, Canvas& c) : matrix(m), canvas(c) {
	bitmaps.reserve(8);
}

namespace {

// Convert hex character to palette index (0-15), returns -1 for invalid
int hexCharToIndex(char c) {
	if (c >= '0' && c <= '9') return c - '0';
	if (c >= 'A' && c <= 'F') return 10 + (c - 'A');
	if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
	return -1;
}

// Convert color value to CRGBA
CRGBA colorToRGBA(uint32_t color) {
	return CRGBA((color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF, 255);
}

// Parse coordinate value as percentage (0-100) or "random", returns NaN if not present
float parseCoordinate(JsonVariant prop, float canvasSize) {
	if (prop.is<const char*>()) {
		const char* str = prop.as<const char*>();
		if (str[0] == '\0') {
			return NAN;  // Empty string = not present
		}
		if (strcmp(str, "random") == 0) {
			float percent = static_cast<float>(hal::random(101));
			return (percent / 100.0f) * canvasSize;
		}
	}
	if (prop.is<float>() || prop.is<int>()) {
		float percent = prop.as<float>();
		return (percent / 100.0f) * canvasSize;
	}
	return NAN;  // Not present
}

// Calculate fade alpha based on elapsed time and fade configuration (linear fade)
uint8_t calculateFadeAlpha(uint32_t elapsed, uint32_t duration,
                           uint32_t fadeInMs, uint32_t fadeOutMs) {
	if (fadeInMs == 0 && fadeOutMs == 0) {
		return 255;
	}

	uint32_t fadeInEnd = fadeInMs;
	uint32_t fadeOutStart = duration > fadeOutMs ? duration - fadeOutMs : 0;

	// Handle overlap - meet in middle
	if (fadeInEnd > fadeOutStart) {
		uint32_t midpoint = duration / 2;
		fadeInEnd = midpoint;
		fadeOutStart = midpoint;
	}

	float alpha = 1.0f;

	if (fadeInMs > 0 && elapsed < fadeInEnd) {
		alpha = static_cast<float>(elapsed) / fadeInEnd;
	} else if (fadeOutMs > 0 && elapsed >= fadeOutStart) {
		uint32_t fadeOutDuration = duration - fadeOutStart;
		if (fadeOutDuration > 0) {
			float progress = static_cast<float>(elapsed - fadeOutStart) / fadeOutDuration;
			alpha = 1.0f - progress;
		}
	}

	return static_cast<uint8_t>(alpha * 255.0f);
}

}  // namespace

void BitmapEffect::add(JsonDocument& props) {
	uint32_t duration = props["duration"];

	// Parse palette array - hub always provides this with PICO-8 defaults
	uint32_t palette[16] = {0};
	uint8_t paletteSize = 0;
	if (props["palette"].is<JsonArray>()) {
		JsonArray paletteArray = props["palette"].as<JsonArray>();
		for (JsonVariant colorVar : paletteArray) {
			if (paletteSize >= 16) break;
			if (colorVar.is<const char*>()) {
				palette[paletteSize++] = parseColor(colorVar.as<const char*>());
			}
		}
	}

	const uint8_t scale = 4;
	float canvasWidth = static_cast<float>(canvas.getWidth());
	float canvasHeight = static_cast<float>(canvas.getHeight());

	// Parse center position as percentage (0-100) or "random"
	float centerX = parseCoordinate(props["centerX"], canvasWidth);
	if (isnan(centerX)) {
		hal::log("ERROR: bitmap missing required 'centerX' prop");
		publishError("bitmap", "missing required 'centerX' prop", props);
		return;
	}

	float centerY = parseCoordinate(props["centerY"], canvasHeight);
	if (isnan(centerY)) {
		hal::log("ERROR: bitmap missing required 'centerY' prop");
		publishError("bitmap", "missing required 'centerY' prop", props);
		return;
	}

	// Parse optional end position
	float endX = parseCoordinate(props["endX"], canvasWidth);
	float endY = parseCoordinate(props["endY"], canvasHeight);
	bool hasEndX = !isnan(endX);
	bool hasEndY = !isnan(endY);
	bool hasEndPosition = hasEndX || hasEndY;

	// If only one end coord specified, use corresponding start coord for the other
	if (hasEndPosition) {
		if (!hasEndX) endX = centerX;
		if (!hasEndY) endY = centerY;
	}

	Bitmap newBitmap;
	newBitmap.duration = duration;
	newBitmap.elapsedTime = 0;
	newBitmap.hasEndPosition = hasEndPosition;

	// Parse easing function
	const char* easingName = props["easing"] | "linear";
	newBitmap.easing = getEasingFunction(easingName);

	// Parse fade configuration
	newBitmap.fadeInMs = props["fadeIn"] | 0;
	newBitmap.fadeOutMs = props["fadeOut"] | 0;

	// Parse frame rate (default 2 FPS)
	newBitmap.frameRate = props["frameRate"] | 2;

	// Parse images array (array of frames, each frame is array of row strings)
	if (props["images"].is<JsonArray>()) {
		JsonArray imagesArray = props["images"].as<JsonArray>();
		newBitmap.frames.reserve(imagesArray.size());

		for (JsonVariant frameVar : imagesArray) {
			if (!frameVar.is<JsonArray>()) continue;

			Frame frame;
			frame.width = 0;
			frame.height = 0;

			JsonArray frameArray = frameVar.as<JsonArray>();
			frame.height = frameArray.size();

			// First pass: determine max width for this frame
			for (JsonVariant row : frameArray) {
				const char* rowStr = row.as<const char*>();
				if (rowStr) {
					size_t len = strlen(rowStr);
					if (len > frame.width) {
						frame.width = len;
					}
				}
			}

			// Pre-allocate pixel array
			frame.pixels.reserve(frame.width * frame.height);

			// Second pass: convert strings to RGBA pixels
			// Character mapping:
			//   ' ' or '.' = transparent
			//   '0'-'9'    = palette index 0-9
			//   'A'-'F'    = palette index 10-15 (case insensitive)
			for (JsonVariant row : frameArray) {
				const char* rowStr = row.as<const char*>();
				for (uint8_t col = 0; col < frame.width; col++) {
					char c = (rowStr && col < strlen(rowStr)) ? rowStr[col] : ' ';

					if (c == ' ' || c == '.') {
						// Transparent
						frame.pixels.push_back(CRGBA(0, 0, 0, 0));
					} else {
						// Parse as hex palette index
						int idx = hexCharToIndex(c);
						if (idx >= 0 && idx < static_cast<int>(paletteSize)) {
							frame.pixels.push_back(colorToRGBA(palette[idx]));
						} else {
							// Unknown character - treat as transparent
							frame.pixels.push_back(CRGBA(0, 0, 0, 0));
						}
					}
				}
			}

			newBitmap.frames.push_back(std::move(frame));
		}
	}

	// Skip if no valid frames
	if (newBitmap.frames.empty()) {
		return;
	}

	// Snap start/end coordinates to LED boundaries based on FIRST frame's dimensions.
	// We need to account for the centering offset: the bitmap's top-left corner is at
	// (center - scaledDimension/2), so we snap that offset and work back to the center.
	const Frame& firstFrame = newBitmap.frames[0];
	uint16_t scaledWidth = firstFrame.width * scale;
	uint16_t scaledHeight = firstFrame.height * scale;

	// Snap start position: compute offset, snap it, then convert back to center
	int16_t offsetX = static_cast<int16_t>(centerX) - (scaledWidth / 2);
	int16_t offsetY = static_cast<int16_t>(centerY) - (scaledHeight / 2);
	offsetX = (offsetX / scale) * scale;
	offsetY = (offsetY / scale) * scale;
	newBitmap.centerX = static_cast<float>(offsetX + (scaledWidth / 2));
	newBitmap.centerY = static_cast<float>(offsetY + (scaledHeight / 2));

	// Snap end position (if specified)
	if (hasEndPosition) {
		offsetX = static_cast<int16_t>(endX) - (scaledWidth / 2);
		offsetY = static_cast<int16_t>(endY) - (scaledHeight / 2);
		offsetX = (offsetX / scale) * scale;
		offsetY = (offsetY / scale) * scale;
		newBitmap.endX = static_cast<float>(offsetX + (scaledWidth / 2));
		newBitmap.endY = static_cast<float>(offsetY + (scaledHeight / 2));
	} else {
		newBitmap.endX = newBitmap.centerX;
		newBitmap.endY = newBitmap.centerY;
	}

	bitmaps.push_back(std::move(newBitmap));
}

void BitmapEffect::update(float deltaTime) {
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	for (auto p = bitmaps.begin(); p != bitmaps.end();) {
		p->elapsedTime += deltaTimeMs;

		if (p->elapsedTime >= p->duration) {
			p = bitmaps.erase(p);
		} else {
			++p;
		}
	}
}

void BitmapEffect::render() {
	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	std::sort(bitmaps.begin(), bitmaps.end(),
	          [](const Bitmap& a, const Bitmap& b) { return a.remaining() < b.remaining(); });

	for (const auto& bmp : bitmaps) {
		if (bmp.frames.empty()) {
			continue;
		}

		// Get current animation frame
		size_t frameIndex = bmp.currentFrameIndex();
		const Frame& currentFrame = bmp.frames[frameIndex];

		if (currentFrame.height == 0 || currentFrame.width == 0) {
			continue;
		}

		// Scale factor: canvas is 4x the matrix resolution
		const uint8_t scale = 4;

		// Calculate scaled dimensions for current frame
		uint16_t scaledWidth = currentFrame.width * scale;
		uint16_t scaledHeight = currentFrame.height * scale;

		// Calculate current position (with tweening if end position specified)
		float currentX = bmp.centerX;
		float currentY = bmp.centerY;

		if (bmp.hasEndPosition) {
			float progress = static_cast<float>(bmp.elapsedTime) / bmp.duration;
			float easedProgress = bmp.easing(progress);
			currentX = bmp.centerX + (bmp.endX - bmp.centerX) * easedProgress;
			currentY = bmp.centerY + (bmp.endY - bmp.centerY) * easedProgress;
		}

		// Position current frame so its center is at the current coordinates
		int16_t offsetX = static_cast<int16_t>(currentX) - (scaledWidth / 2);
		int16_t offsetY = static_cast<int16_t>(currentY) - (scaledHeight / 2);

		// Skip if frame is completely off-canvas
		if (offsetX + scaledWidth <= 0 || offsetX >= canvasWidth ||
		    offsetY + scaledHeight <= 0 || offsetY >= canvasHeight) {
			continue;
		}

		// Calculate fade alpha (once per bitmap, not per pixel)
		uint8_t fadeAlpha = calculateFadeAlpha(
		    bmp.elapsedTime, bmp.duration, bmp.fadeInMs, bmp.fadeOutMs);

		// Render current frame's pre-computed pixels, scaled up 4x
		for (uint8_t row = 0; row < currentFrame.height; row++) {
			for (uint8_t col = 0; col < currentFrame.width; col++) {
				const CRGBA& pixel = currentFrame.pixels[row * currentFrame.width + col];
				if (pixel.a != 0) {
					// Apply fade alpha to pixel alpha (multiplicative blend)
					uint8_t effectiveAlpha = (pixel.a * fadeAlpha) / 255;
					if (effectiveAlpha > 0) {
						// Draw a 4x4 block for each pixel
						int16_t x = offsetX + col * scale;
						int16_t y = offsetY + row * scale;
						canvas.drawRectangle(x, y, scale, scale,
						    CRGBA(pixel.r, pixel.g, pixel.b, effectiveAlpha), BlendMode::ALPHA);
					}
				}
			}
		}
	}
}

void BitmapEffect::reset() {
	bitmaps.clear();
}
