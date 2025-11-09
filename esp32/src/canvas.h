#pragma once

#include <cstdint>

// RGBA color format macros (0xRRGGBBAA)
#define RGBA(r, g, b, a) \
    (((uint32_t)(r) << 24) | ((uint32_t)(g) << 16) | \
     ((uint32_t)(b) << 8) | (uint32_t)(a))

#define RGBA_RED(color)   (((color) >> 24) & 0xFF)
#define RGBA_GREEN(color) (((color) >> 16) & 0xFF)
#define RGBA_BLUE(color)  (((color) >> 8) & 0xFF)
#define RGBA_ALPHA(color) ((color) & 0xFF)

class Canvas {
  private:
    uint16_t width;
    uint16_t height;
    uint32_t size;
    uint32_t* pixels;

    uint32_t index(uint16_t x, uint16_t y) const;
    bool inBounds(uint16_t x, uint16_t y) const;

  public:
    Canvas(uint16_t width, uint16_t height);
    ~Canvas();

    uint16_t getWidth() const;
    uint16_t getHeight() const;
    uint32_t getSize() const;

    void setPixel(uint16_t x, uint16_t y, uint32_t rgbaValue);
    uint32_t getPixel(uint16_t x, uint16_t y) const;
    uint32_t* getPixels() const;

    void clear();
    void fill(uint32_t rgbaValue);
};
