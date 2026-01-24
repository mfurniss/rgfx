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

// Palette index for transparent pixels
constexpr uint8_t TRANSPARENT_INDEX = 0xFF;

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

size_t BitmapEffect::estimateBitmapMemory(JsonDocument& props) {
	size_t totalPixels = 0;

	if (props["images"].is<JsonArray>()) {
		JsonArray images = props["images"].as<JsonArray>();
		for (JsonVariant frame : images) {
			if (frame.is<JsonArray>()) {
				JsonArray rows = frame.as<JsonArray>();
				size_t height = rows.size();
				size_t width = 0;
				for (JsonVariant row : rows) {
					if (row.is<const char*>()) {
						size_t len = strlen(row.as<const char*>());
						if (len > width) width = len;
					}
				}
				totalPixels += width * height;
			}
		}
	}

	// Estimate: 1 byte per pixel (palettized) + Bitmap struct overhead
	return totalPixels + sizeof(Bitmap) + 128;
}

size_t BitmapEffect::calculateBitmapMemory(const Bitmap& bitmap) {
	size_t total = sizeof(Bitmap);
	for (const auto& frame : bitmap.frames) {
		total += frame.indices.size() + sizeof(Frame);
	}
	return total;
}

void BitmapEffect::add(JsonDocument& props) {
	// Memory validation: estimate required memory before parsing
	size_t requiredMemory = estimateBitmapMemory(props);

	// Check against bitmap memory budget
	if (totalMemoryUsed + requiredMemory > MAX_BITMAP_MEMORY) {
		hal::log("ERROR: bitmap memory budget exceeded (%zu + %zu > %zu)",
		         totalMemoryUsed, requiredMemory, MAX_BITMAP_MEMORY);
		publishError("bitmap", "memory budget exceeded", props);
		return;
	}

	// Check against system heap
	if (hal::getFreeHeap() < requiredMemory + MIN_FREE_HEAP) {
		hal::log("ERROR: insufficient heap for bitmap (%zu required, %zu available)",
		         requiredMemory, hal::getFreeHeap());
		publishError("bitmap", "insufficient memory", props);
		return;
	}

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
	newBitmap.paletteSize = paletteSize;

	// Copy palette to bitmap for render-time lookup
	for (uint8_t i = 0; i < paletteSize && i < 16; i++) {
		newBitmap.palette[i] = colorToRGBA(palette[i]);
	}

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

			// Enforce frame limit
			if (newBitmap.frames.size() >= MAX_FRAMES_PER_BITMAP) {
				hal::log("WARN: bitmap frame limit reached (%d), truncating",
				         MAX_FRAMES_PER_BITMAP);
				break;
			}

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

			// Enforce dimension limits
			if (frame.width > MAX_FRAME_DIMENSION || frame.height > MAX_FRAME_DIMENSION) {
				hal::log("ERROR: bitmap frame too large (%dx%d, max %d)",
				         frame.width, frame.height, MAX_FRAME_DIMENSION);
				publishError("bitmap", "frame dimensions exceed limit", props);
				return;
			}

			// Pre-allocate index array
			frame.indices.reserve(frame.width * frame.height);

			// Second pass: convert strings to palette indices
			// Character mapping:
			//   ' ' or '.' = transparent (0xFF)
			//   '0'-'9'    = palette index 0-9
			//   'A'-'F'    = palette index 10-15 (case insensitive)
			for (JsonVariant row : frameArray) {
				const char* rowStr = row.as<const char*>();
				for (uint8_t col = 0; col < frame.width; col++) {
					char c = (rowStr && col < strlen(rowStr)) ? rowStr[col] : ' ';

					if (c == ' ' || c == '.') {
						// Transparent
						frame.indices.push_back(TRANSPARENT_INDEX);
					} else {
						// Parse as hex palette index
						int idx = hexCharToIndex(c);
						if (idx >= 0 && idx < static_cast<int>(paletteSize)) {
							frame.indices.push_back(static_cast<uint8_t>(idx));
						} else {
							// Unknown character - treat as transparent
							frame.indices.push_back(TRANSPARENT_INDEX);
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

	// Calculate and track memory usage
	newBitmap.memoryUsed = calculateBitmapMemory(newBitmap);
	totalMemoryUsed += newBitmap.memoryUsed;

	// Cap vector size as safety net (memory budget is primary limit)
	// Higher cap than other effects since bitmaps have memory budget protection
	static constexpr size_t MAX_BITMAPS = 1024;
	if (bitmaps.size() >= MAX_BITMAPS) {
		// Decrement memory tracking before dropping oldest
		totalMemoryUsed -= bitmaps.front().memoryUsed;
		bitmaps.erase(bitmaps.begin());
	}
	bitmaps.push_back(std::move(newBitmap));
}

void BitmapEffect::update(float deltaTime) {
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	for (auto p = bitmaps.begin(); p != bitmaps.end();) {
		p->elapsedTime += deltaTimeMs;

		if (p->elapsedTime >= p->duration) {
			// Decrement memory tracking before erasing
			totalMemoryUsed -= p->memoryUsed;
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

		// Render current frame using palette lookup
		for (uint8_t row = 0; row < currentFrame.height; row++) {
			for (uint8_t col = 0; col < currentFrame.width; col++) {
				uint8_t idx = currentFrame.indices[row * currentFrame.width + col];
				if (idx != TRANSPARENT_INDEX && idx < bmp.paletteSize) {
					const CRGBA& pixel = bmp.palette[idx];
					// Apply fade alpha (palette colors have alpha=255)
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
	totalMemoryUsed = 0;
}
