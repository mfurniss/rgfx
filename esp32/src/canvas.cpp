#include "canvas.h"
#include <cstring>

Canvas::Canvas(uint16_t width, uint16_t height)
    : width(width), height(height), size(width * height) {
    pixels = new uint32_t[size];
    clear();
}

Canvas::~Canvas() {
    delete[] pixels;
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
    return x >= 0 && x < width && y >= 0 && y < height;
}

void Canvas::setPixel(uint16_t x, uint16_t y, uint32_t rgbaValue, BlendMode mode) {
    if (!inBounds(x, y)) {
        return;
    }

    uint32_t idx = index(x, y);

    switch (mode) {
        case BlendMode::REPLACE:
            pixels[idx] = rgbaValue;
            break;

        case BlendMode::ALPHA:
            blendAlpha(pixels[idx], rgbaValue);
            break;

        case BlendMode::ADDITIVE:
            blendAdditive(pixels[idx], rgbaValue);
            break;

        case BlendMode::AVERAGE:
            blendAverage(pixels[idx], rgbaValue);
            break;
    }
}

uint32_t Canvas::getPixel(uint16_t x, uint16_t y) const {
    if (!inBounds(x, y)) {
        return 0;
    }
    return pixels[index(x, y)];
}

uint32_t* Canvas::getPixels() const {
    return pixels;
}

void Canvas::clear() {
    memset(pixels, 0, size * sizeof(uint32_t));
}

void Canvas::fill(uint32_t rgbaValue) {
    for (uint32_t i = 0; i < size; i++) {
        pixels[i] = rgbaValue;
    }
}

inline void Canvas::blendAlpha(uint32_t& existing, uint32_t incoming) const {
    uint8_t existingR = RGBA_RED(existing);
    uint8_t existingG = RGBA_GREEN(existing);
    uint8_t existingB = RGBA_BLUE(existing);
    uint8_t existingA = RGBA_ALPHA(existing);

    uint8_t incomingR = RGBA_RED(incoming);
    uint8_t incomingG = RGBA_GREEN(incoming);
    uint8_t incomingB = RGBA_BLUE(incoming);
    uint8_t incomingA = RGBA_ALPHA(incoming);

    uint8_t newR = ((existingR * (255 - incomingA)) + (incomingR * incomingA)) / 255;
    uint8_t newG = ((existingG * (255 - incomingA)) + (incomingG * incomingA)) / 255;
    uint8_t newB = ((existingB * (255 - incomingA)) + (incomingB * incomingA)) / 255;
    uint8_t newA = existingA + incomingA - ((existingA * incomingA) / 255);

    existing = RGBA(newR, newG, newB, newA);
}

inline void Canvas::blendAdditive(uint32_t& existing, uint32_t incoming) const {
    uint8_t existingR = RGBA_RED(existing);
    uint8_t existingG = RGBA_GREEN(existing);
    uint8_t existingB = RGBA_BLUE(existing);
    uint8_t existingA = RGBA_ALPHA(existing);

    uint8_t incomingR = RGBA_RED(incoming);
    uint8_t incomingG = RGBA_GREEN(incoming);
    uint8_t incomingB = RGBA_BLUE(incoming);
    uint8_t incomingA = RGBA_ALPHA(incoming);

    uint8_t newR = (existingR + incomingR > 255) ? 255 : existingR + incomingR;
    uint8_t newG = (existingG + incomingG > 255) ? 255 : existingG + incomingG;
    uint8_t newB = (existingB + incomingB > 255) ? 255 : existingB + incomingB;
    uint8_t newA = (existingA + incomingA > 255) ? 255 : existingA + incomingA;

    existing = RGBA(newR, newG, newB, newA);
}

inline void Canvas::blendAverage(uint32_t& existing, uint32_t incoming) const {
    uint8_t existingR = RGBA_RED(existing);
    uint8_t existingG = RGBA_GREEN(existing);
    uint8_t existingB = RGBA_BLUE(existing);
    uint8_t existingA = RGBA_ALPHA(existing);

    uint8_t incomingR = RGBA_RED(incoming);
    uint8_t incomingG = RGBA_GREEN(incoming);
    uint8_t incomingB = RGBA_BLUE(incoming);
    uint8_t incomingA = RGBA_ALPHA(incoming);

    uint8_t newR = (existingR + incomingR) / 2;
    uint8_t newG = (existingG + incomingG) / 2;
    uint8_t newB = (existingB + incomingB) / 2;
    uint8_t newA = (existingA + incomingA) / 2;

    existing = RGBA(newR, newG, newB, newA);
}
