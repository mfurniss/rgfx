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

    // Rectangle drawing
    void drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGB& color);
    void drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const CRGBA& color, BlendMode mode = BlendMode::ADDITIVE);

    CRGB getPixel(uint16_t x, uint16_t y) const;
    CRGB* getPixels() const;

    void clear();
    void fill(const CRGB& color);
};
