#include "bitmap.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include "graphics/canvas.h"
#include <algorithm>

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

// Parse coordinate value as percentage (0-100) or "random", returns -1 if not present
float parseCoordinate(JsonVariant prop, float canvasSize) {
	if (prop.is<const char*>() && strcmp(prop.as<const char*>(), "random") == 0) {
		float percent = static_cast<float>(hal::random(101));
		return (percent / 100.0f) * canvasSize;
	} else if (prop.is<float>() || prop.is<int>()) {
		float percent = prop.as<float>();
		return (percent / 100.0f) * canvasSize;
	}
	return -1.0f;  // Not present
}

// Snap coordinate to LED boundary (multiples of scale)
float snapToLed(float coord, uint8_t scale) {
	return static_cast<float>((static_cast<int16_t>(coord) / scale) * scale);
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
	if (centerX < 0) {
		hal::log("ERROR: bitmap missing required 'centerX' prop");
		return;
	}

	float centerY = parseCoordinate(props["centerY"], canvasHeight);
	if (centerY < 0) {
		hal::log("ERROR: bitmap missing required 'centerY' prop");
		return;
	}

	// Parse optional end position
	float endX = parseCoordinate(props["endX"], canvasWidth);
	float endY = parseCoordinate(props["endY"], canvasHeight);
	bool hasEndX = endX >= 0;
	bool hasEndY = endY >= 0;
	bool hasEndPosition = hasEndX || hasEndY;

	// If only one end coord specified, use corresponding start coord for the other
	if (hasEndPosition) {
		if (!hasEndX) endX = centerX;
		if (!hasEndY) endY = centerY;
	}

	Bitmap newBitmap;
	newBitmap.duration = duration;
	newBitmap.elapsedTime = 0;
	newBitmap.imageWidth = 0;
	newBitmap.imageHeight = 0;

	// Snap all coordinates to LED boundaries at parse time
	newBitmap.centerX = snapToLed(centerX, scale);
	newBitmap.centerY = snapToLed(centerY, scale);
	newBitmap.endX = hasEndPosition ? snapToLed(endX, scale) : newBitmap.centerX;
	newBitmap.endY = hasEndPosition ? snapToLed(endY, scale) : newBitmap.centerY;
	newBitmap.hasEndPosition = hasEndPosition;

	// Parse easing function
	const char* easingName = props["easing"] | "linear";
	newBitmap.easing = getEasingFunction(easingName);

	// Parse fade configuration
	newBitmap.fadeInMs = props["fadeIn"] | 0;
	newBitmap.fadeOutMs = props["fadeOut"] | 0;

	// Parse image array and convert to RGBA pixels
	if (props["image"].is<JsonArray>()) {
		JsonArray imageArray = props["image"].as<JsonArray>();
		newBitmap.imageHeight = imageArray.size();

		// First pass: determine max width
		for (JsonVariant row : imageArray) {
			const char* rowStr = row.as<const char*>();
			if (rowStr) {
				size_t len = strlen(rowStr);
				if (len > newBitmap.imageWidth) {
					newBitmap.imageWidth = len;
				}
			}
		}

		// Pre-allocate pixel array
		newBitmap.pixels.reserve(newBitmap.imageWidth * newBitmap.imageHeight);

		// Second pass: convert strings to RGBA pixels
		// Character mapping:
		//   ' ' or '.' = transparent
		//   '0'-'9'    = palette index 0-9
		//   'A'-'F'    = palette index 10-15 (case insensitive)
		for (JsonVariant row : imageArray) {
			const char* rowStr = row.as<const char*>();
			for (uint8_t col = 0; col < newBitmap.imageWidth; col++) {
				char c = (rowStr && col < strlen(rowStr)) ? rowStr[col] : ' ';

				if (c == ' ' || c == '.') {
					// Transparent
					newBitmap.pixels.push_back(CRGBA(0, 0, 0, 0));
				} else {
					// Parse as hex palette index
					int idx = hexCharToIndex(c);
					if (idx >= 0 && idx < static_cast<int>(paletteSize)) {
						newBitmap.pixels.push_back(colorToRGBA(palette[idx]));
					} else {
						// Unknown character - treat as transparent
						newBitmap.pixels.push_back(CRGBA(0, 0, 0, 0));
					}
				}
			}
		}
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
		if (bmp.imageHeight == 0 || bmp.imageWidth == 0) {
			continue;
		}

		// Scale factor: canvas is 4x the matrix resolution
		const uint8_t scale = 4;

		// Calculate scaled dimensions
		uint16_t scaledWidth = bmp.imageWidth * scale;
		uint16_t scaledHeight = bmp.imageHeight * scale;

		// Calculate current position (with tweening if end position specified)
		float currentX = bmp.centerX;
		float currentY = bmp.centerY;

		if (bmp.hasEndPosition) {
			float progress = static_cast<float>(bmp.elapsedTime) / bmp.duration;
			float easedProgress = bmp.easing(progress);
			currentX = bmp.centerX + (bmp.endX - bmp.centerX) * easedProgress;
			currentY = bmp.centerY + (bmp.endY - bmp.centerY) * easedProgress;
		}

		// Position bitmap so its center is at the current coordinates
		int16_t offsetX = static_cast<int16_t>(currentX) - (scaledWidth / 2);
		int16_t offsetY = static_cast<int16_t>(currentY) - (scaledHeight / 2);

		// Skip if bitmap is completely off-canvas
		if (offsetX + scaledWidth <= 0 || offsetX >= canvasWidth ||
		    offsetY + scaledHeight <= 0 || offsetY >= canvasHeight) {
			continue;
		}

		// Calculate fade alpha (once per bitmap, not per pixel)
		uint8_t fadeAlpha = calculateFadeAlpha(
		    bmp.elapsedTime, bmp.duration, bmp.fadeInMs, bmp.fadeOutMs);

		// Render pre-computed pixels, scaled up 4x
		for (uint8_t row = 0; row < bmp.imageHeight; row++) {
			for (uint8_t col = 0; col < bmp.imageWidth; col++) {
				const CRGBA& pixel = bmp.pixels[row * bmp.imageWidth + col];
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
