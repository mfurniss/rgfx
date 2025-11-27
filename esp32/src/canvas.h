#pragma once

#include <cstdint>

class Matrix;

// RGBA color format macros (0xRRGGBBAA)
#define RGBA(r, g, b, a) \
    (((uint32_t)(r) << 24) | ((uint32_t)(g) << 16) | \
     ((uint32_t)(b) << 8) | (uint32_t)(a))

#define RGBA_RED(color)   (((color) >> 24) & 0xFF)
#define RGBA_GREEN(color) (((color) >> 16) & 0xFF)
#define RGBA_BLUE(color)  (((color) >> 8) & 0xFF)
#define RGBA_ALPHA(color) ((color) & 0xFF)

enum class BlendMode {
	REPLACE,   // Overwrite pixel (default)
	ALPHA,     // Alpha compositing (standard over operator)
	ADDITIVE,  // Add RGB values
	AVERAGE    // Average RGB values
};

class Canvas {
  private:
    uint16_t width;
    uint16_t height;
    uint32_t size;
    uint32_t* pixels;

    uint32_t index(uint16_t x, uint16_t y) const;
    bool inBounds(uint16_t x, uint16_t y) const;

    void blendAlpha(uint32_t& existing, uint32_t incoming) const;
    void blendAdditive(uint32_t& existing, uint32_t incoming) const;
    void blendAverage(uint32_t& existing, uint32_t incoming) const;

  public:
    Canvas(const Matrix& matrix);
    ~Canvas();

    bool isValid() const;

    uint16_t getWidth() const;
    uint16_t getHeight() const;
    uint32_t getSize() const;

    void drawPixel(uint16_t x, uint16_t y, uint32_t rgbaValue, BlendMode mode = BlendMode::REPLACE);
    void drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint32_t rgbaValue, BlendMode mode = BlendMode::REPLACE);
    uint32_t getPixel(uint16_t x, uint16_t y) const;
    uint32_t* getPixels() const;

    void clear();
    void fill(uint32_t rgbaValue);
};
