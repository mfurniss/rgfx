#include "bitmap.h"
#include "effect_utils.h"
#include "canvas.h"
#include <algorithm>

static const uint32_t DEFAULT_COLOR = 0xFFFF00;
static const uint32_t DEFAULT_DURATION = 1000;

BitmapEffect::BitmapEffect(const Matrix& m) : matrix(m), canvas(m) {}

void BitmapEffect::add(JsonDocument& props) {
	uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;
	uint32_t duration = props["duration"] | DEFAULT_DURATION;

	// Parse center position as percentage (0-100), "random", or default to center (50%)
	float centerXPercent = 50.0f;
	if (props["centerX"].is<const char*>() && strcmp(props["centerX"].as<const char*>(), "random") == 0) {
		centerXPercent = random(0, 101);
	} else if (props["centerX"].is<float>() || props["centerX"].is<int>()) {
		centerXPercent = props["centerX"].as<float>();
	}

	float centerYPercent = 50.0f;
	if (props["centerY"].is<const char*>() && strcmp(props["centerY"].as<const char*>(), "random") == 0) {
		centerYPercent = random(0, 101);
	} else if (props["centerY"].is<float>() || props["centerY"].is<int>()) {
		centerYPercent = props["centerY"].as<float>();
	}

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

		// Extract RGB from color
		uint8_t r = (color >> 16) & 0xFF;
		uint8_t g = (color >> 8) & 0xFF;
		uint8_t b = color & 0xFF;
		uint32_t rgbaColor = RGBA(r, g, b, 255);

		// Second pass: convert strings to RGBA pixels
		for (JsonVariant row : imageArray) {
			const char* rowStr = row.as<const char*>();
			for (uint8_t col = 0; col < newBitmap.imageWidth; col++) {
				if (rowStr && col < strlen(rowStr) && rowStr[col] != ' ') {
					newBitmap.pixels.push_back(rgbaColor);
				} else {
					newBitmap.pixels.push_back(0);  // Transparent
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
	canvas.clear();

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
				uint32_t pixel = bmp.pixels[row * bmp.imageWidth + col];
				if (pixel != 0) {
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

Canvas& BitmapEffect::getCanvas() {
	return canvas;
}
