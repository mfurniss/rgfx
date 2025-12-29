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

	// Parse center position as percentage (0-100) - hub must provide these
	if (!props["centerX"].is<float>() && !props["centerX"].is<int>()) {
		hal::log("ERROR: bitmap missing required 'centerX' prop");
		return;
	}
	float centerXPercent = props["centerX"].as<float>();

	if (!props["centerY"].is<float>() && !props["centerY"].is<int>()) {
		hal::log("ERROR: bitmap missing required 'centerY' prop");
		return;
	}
	float centerYPercent = props["centerY"].as<float>();

	Bitmap newBitmap;
	newBitmap.duration = duration;
	newBitmap.elapsedTime = 0;
	newBitmap.imageWidth = 0;
	newBitmap.imageHeight = 0;
	newBitmap.centerX = (centerXPercent / 100.0f) * canvas.getWidth();
	newBitmap.centerY = (centerYPercent / 100.0f) * canvas.getHeight();

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

		// Position bitmap so its center is at the specified coordinates
		int16_t offsetX = static_cast<int16_t>(bmp.centerX) - (scaledWidth / 2);
		int16_t offsetY = static_cast<int16_t>(bmp.centerY) - (scaledHeight / 2);

		// Skip if bitmap is completely off-canvas
		if (offsetX + scaledWidth <= 0 || offsetX >= canvasWidth ||
		    offsetY + scaledHeight <= 0 || offsetY >= canvasHeight) {
			continue;
		}

		// Render pre-computed pixels, scaled up 4x
		for (uint8_t row = 0; row < bmp.imageHeight; row++) {
			for (uint8_t col = 0; col < bmp.imageWidth; col++) {
				const CRGBA& pixel = bmp.pixels[row * bmp.imageWidth + col];
				if (pixel.a != 0) {
					// Draw a 4x4 block for each pixel
					int16_t x = offsetX + col * scale;
					int16_t y = offsetY + row * scale;
					canvas.drawRectangle(x, y, scale, scale, pixel, BlendMode::ALPHA);
				}
			}
		}
	}
}

void BitmapEffect::reset() {
	bitmaps.clear();
}
