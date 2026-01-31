#pragma once

#include <cstdint>
#include "hal/types.h"

// Forward declarations
class Matrix;

/**
 * RGBA color for passing to blend operations.
 * Alpha is used during blending, but only RGB is stored in the canvas.
 */
struct CRGBA {
	uint8_t r, g, b, a;

	CRGBA() : r(0), g(0), b(0), a(255) {}
	CRGBA(uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255) : r(r), g(g), b(b), a(a) {}
	CRGBA(const CRGB& rgb, uint8_t a = 255);

	CRGB toCRGB() const;
};

enum class BlendMode {
	REPLACE,   // Overwrite pixel (default for CRGBA)
	ALPHA,     // Alpha compositing: result = src * alpha + dst * (1 - alpha)
	ADDITIVE,  // Add with alpha scaling: result = dst + src * alpha
	AVERAGE    // Average RGB values (50/50 blend, ignores alpha)
};

/**
 * Canvas stores RGB pixels (no alpha).
 * Alpha is used only during blend operations via CRGBA input.
 */
class Canvas {
  private:
    uint16_t width;
    uint16_t height;
    uint32_t size;
    CRGB* pixels;

    uint32_t index(uint16_t x, uint16_t y) const;
    bool inBounds(uint16_t x, uint16_t y) const;

    void blendAlpha(CRGB& existing, const CRGBA& incoming) const;
    void blendAdditive(CRGB& existing, const CRGBA& incoming) const;
    void blendAverage(CRGB& existing, const CRGB& incoming) const;

  public:
    Canvas(uint16_t w, uint16_t h);  // For testing without Matrix dependency
    Canvas(const Matrix& matrix);
    ~Canvas();

    bool isValid() const;

    uint16_t getWidth() const;
    uint16_t getHeight() const;
    uint32_t getSize() const;

    // Direct write (no blending)
    void drawPixel(uint16_t x, uint16_t y, const CRGB& color);

    // Blend with default mode (ADDITIVE for bright effects)
    void drawPixel(uint16_t x, uint16_t y, const CRGBA& color);

    // Explicit blend mode
    void drawPixel(uint16_t x, uint16_t y, const CRGBA& color, BlendMode mode);

    // Rectangle drawing (unsigned - no clipping for negative coords)
    void drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGB& color);
    void drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGBA& color, BlendMode mode = BlendMode::ADDITIVE);

    // Rectangle drawing (signed - clips negative coords to canvas bounds)
    void drawRectangle(int16_t x, int16_t y, int16_t w, int16_t h, const CRGB& color);
    void drawRectangle(int16_t x, int16_t y, int16_t w, int16_t h, const CRGBA& color, BlendMode mode);

    CRGB getPixel(uint16_t x, uint16_t y) const;
    CRGB* getPixels() const;

    void clear();
    void fill(const CRGB& color);

    // Fast 4x4 block fill - caller must ensure x+4 <= width and y+4 <= height
    inline void fillBlock4x4(uint16_t x, uint16_t y, const CRGB& color) {
        CRGB* row = pixels + (y * width) + x;
        row[0] = row[1] = row[2] = row[3] = color;
        row += width;
        row[0] = row[1] = row[2] = row[3] = color;
        row += width;
        row[0] = row[1] = row[2] = row[3] = color;
        row += width;
        row[0] = row[1] = row[2] = row[3] = color;
    }

    // Fast 4x4 block fill with alpha blending
    inline void fillBlock4x4Alpha(uint16_t x, uint16_t y, const CRGB& color, uint8_t alpha) {
        if (alpha == 255) {
            fillBlock4x4(x, y, color);
            return;
        }
        uint8_t invAlpha = 255 - alpha;
        CRGB* row = pixels + (y * width) + x;
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                row[j].r = (color.r * alpha + row[j].r * invAlpha) / 255;
                row[j].g = (color.g * alpha + row[j].g * invAlpha) / 255;
                row[j].b = (color.b * alpha + row[j].b * invAlpha) / 255;
            }
            row += width;
        }
    }

    // Fast 4x4 block fill with additive blending
    inline void fillBlock4x4Additive(uint16_t x, uint16_t y, const CRGB& color, uint8_t alpha) {
        CRGB* row = pixels + (y * width) + x;
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                uint16_t r = row[j].r + (color.r * alpha / 255);
                uint16_t g = row[j].g + (color.g * alpha / 255);
                uint16_t b = row[j].b + (color.b * alpha / 255);
                row[j].r = (r > 255) ? 255 : r;
                row[j].g = (g > 255) ? 255 : g;
                row[j].b = (b > 255) ? 255 : b;
            }
            row += width;
        }
    }
};
