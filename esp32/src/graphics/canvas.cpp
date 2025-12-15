#include "canvas.h"
#include "matrix.h"
#include "log.h"
#include "hal/types.h"
#include <cstring>
#include <cstdlib>

// CRGBA implementation
CRGBA::CRGBA(const CRGB& rgb, uint8_t a) : r(rgb.r), g(rgb.g), b(rgb.b), a(a) {}

CRGB CRGBA::toCRGB() const {
	return CRGB(r, g, b);
}

// Simple constructor for testing (no Matrix dependency)
Canvas::Canvas(uint16_t w, uint16_t h)
    : width(w), height(h), size(w * h), pixels(nullptr) {
	pixels = (CRGB*)malloc(size * sizeof(CRGB));
	if (pixels) {
		clear();
	}
}

Canvas::Canvas(const Matrix& matrix)
    : width(matrix.width * 4),
      height((matrix.layoutType == LayoutType::STRIP) ? 1 : matrix.height * 4),
      size(width * height),
      pixels(nullptr) {
	pixels = (CRGB*)malloc(size * sizeof(CRGB));
	if (!pixels) {
#ifndef UNIT_TEST
		log("ERROR: Failed to allocate canvas buffer");
#endif
		return;
	}
	clear();
}

Canvas::~Canvas() {
    free(pixels);
}

bool Canvas::isValid() const {
    return pixels != nullptr;
}

uint16_t Canvas::getWidth() const {
    return width;
}

uint16_t Canvas::getHeight() const {
    return height;
}

uint32_t Canvas::getSize() const {
    return size;
}

uint32_t Canvas::index(uint16_t x, uint16_t y) const {
    return y * width + x;
}

bool Canvas::inBounds(uint16_t x, uint16_t y) const {
    return x < width && y < height;
}

// Direct write (no blending)
void Canvas::drawPixel(uint16_t x, uint16_t y, const CRGB& color) {
    if (!pixels || !inBounds(x, y)) {
        return;
    }
    pixels[index(x, y)] = color;
}

// Default blend mode is ADDITIVE for bright effects
void Canvas::drawPixel(uint16_t x, uint16_t y, const CRGBA& color) {
    drawPixel(x, y, color, BlendMode::ADDITIVE);
}

// Explicit blend mode
void Canvas::drawPixel(uint16_t x, uint16_t y, const CRGBA& color, BlendMode mode) {
    if (!pixels || !inBounds(x, y)) {
        return;
    }

    uint32_t idx = index(x, y);

    switch (mode) {
        case BlendMode::REPLACE:
            pixels[idx] = color.toCRGB();
            break;

        case BlendMode::ALPHA:
            blendAlpha(pixels[idx], color);
            break;

        case BlendMode::ADDITIVE:
            blendAdditive(pixels[idx], color);
            break;

        case BlendMode::AVERAGE:
            blendAverage(pixels[idx], color.toCRGB());
            break;
    }
}

// Direct write rectangle
void Canvas::drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGB& color) {
    if (!pixels || w == 0 || h == 0) {
        return;
    }

    uint16_t x2 = x + w;
    uint16_t y2 = y + h;

    if (x >= width || y >= height) {
        return;
    }

    if (x2 > width) x2 = width;
    if (y2 > height) y2 = height;

    for (uint16_t row = y; row < y2; row++) {
        uint32_t idx = index(x, row);
        for (uint16_t col = x; col < x2; col++) {
            pixels[idx++] = color;
        }
    }
}

// Signed coordinate rectangle with clipping
void Canvas::drawRectangle(int16_t x, int16_t y, int16_t w, int16_t h, const CRGB& color) {
	if (!pixels || w <= 0 || h <= 0) {
		return;
	}

	// Calculate end coordinates
	int16_t x2 = x + w;
	int16_t y2 = y + h;

	// Clip to canvas bounds
	if (x < 0) x = 0;
	if (y < 0) y = 0;
	if (x2 > static_cast<int16_t>(width)) x2 = static_cast<int16_t>(width);
	if (y2 > static_cast<int16_t>(height)) y2 = static_cast<int16_t>(height);

	// Skip if completely outside canvas
	if (x >= x2 || y >= y2) {
		return;
	}

	// Delegate to unsigned version with clipped values
	drawRectangle(
		static_cast<uint16_t>(x),
		static_cast<uint16_t>(y),
		static_cast<uint16_t>(x2 - x),
		static_cast<uint16_t>(y2 - y),
		color
	);
}

// Blended rectangle
void Canvas::drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGBA& color, BlendMode mode) {
    if (!pixels || w == 0 || h == 0) {
        return;
    }

    uint16_t x2 = x + w;
    uint16_t y2 = y + h;

    if (x >= width || y >= height) {
        return;
    }

    if (x2 > width) x2 = width;
    if (y2 > height) y2 = height;

    // Hoist switch outside inner loops for better branch prediction
    switch (mode) {
        case BlendMode::REPLACE: {
            CRGB rgb = color.toCRGB();
            for (uint16_t row = y; row < y2; row++) {
                uint32_t idx = index(x, row);
                for (uint16_t col = x; col < x2; col++) {
                    pixels[idx++] = rgb;
                }
            }
            break;
        }
        case BlendMode::ALPHA:
            for (uint16_t row = y; row < y2; row++) {
                uint32_t idx = index(x, row);
                for (uint16_t col = x; col < x2; col++) {
                    blendAlpha(pixels[idx++], color);
                }
            }
            break;
        case BlendMode::ADDITIVE:
            for (uint16_t row = y; row < y2; row++) {
                uint32_t idx = index(x, row);
                for (uint16_t col = x; col < x2; col++) {
                    blendAdditive(pixels[idx++], color);
                }
            }
            break;
        case BlendMode::AVERAGE: {
            CRGB rgb = color.toCRGB();
            for (uint16_t row = y; row < y2; row++) {
                uint32_t idx = index(x, row);
                for (uint16_t col = x; col < x2; col++) {
                    blendAverage(pixels[idx++], rgb);
                }
            }
            break;
        }
    }
}

CRGB Canvas::getPixel(uint16_t x, uint16_t y) const {
    if (!pixels || !inBounds(x, y)) {
        return CRGB::Black;
    }
    return pixels[index(x, y)];
}

CRGB* Canvas::getPixels() const {
    return pixels;
}

void Canvas::clear() {
    if (!pixels) {
        return;
    }
    // Zero all RGB bytes - CRGB is trivially copyable with 3 bytes
    memset(static_cast<void*>(pixels), 0, size * sizeof(CRGB));
}

void Canvas::fill(const CRGB& color) {
    if (!pixels) {
        return;
    }
    for (uint32_t i = 0; i < size; i++) {
        pixels[i] = color;
    }
}

inline void Canvas::blendAlpha(CRGB& existing, const CRGBA& incoming) const {
    // result = src * alpha + dst * (255 - alpha)
    uint8_t alpha = incoming.a;
    uint8_t invAlpha = 255 - alpha;

    existing.r = ((existing.r * invAlpha) + (incoming.r * alpha)) / 255;
    existing.g = ((existing.g * invAlpha) + (incoming.g * alpha)) / 255;
    existing.b = ((existing.b * invAlpha) + (incoming.b * alpha)) / 255;
}

inline void Canvas::blendAdditive(CRGB& existing, const CRGBA& incoming) const {
    // result = dst + src * alpha
    uint8_t alpha = incoming.a;

    uint16_t newR = existing.r + ((incoming.r * alpha) / 255);
    uint16_t newG = existing.g + ((incoming.g * alpha) / 255);
    uint16_t newB = existing.b + ((incoming.b * alpha) / 255);

    existing.r = (newR > 255) ? 255 : newR;
    existing.g = (newG > 255) ? 255 : newG;
    existing.b = (newB > 255) ? 255 : newB;
}

inline void Canvas::blendAverage(CRGB& existing, const CRGB& incoming) const {
    // Simple 50/50 blend
    existing.r = (existing.r + incoming.r) / 2;
    existing.g = (existing.g + incoming.g) / 2;
    existing.b = (existing.b + incoming.b) / 2;
}
