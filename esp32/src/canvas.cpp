#include "canvas.h"
#include "matrix.h"
#include "log.h"
#include <cstring>
#include <cstdlib>

Canvas::Canvas(const Matrix& matrix)
    : width(matrix.width * 4),
      height((matrix.layoutType == LayoutType::STRIP) ? 1 : matrix.height * 4),
      size(width * height),
      pixels(nullptr) {
    pixels = (uint32_t*)malloc(size * sizeof(uint32_t));
    if (!pixels) {
        log("ERROR: Failed to allocate canvas buffer");
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

void Canvas::drawPixel(uint16_t x, uint16_t y, uint32_t rgbaValue, BlendMode mode) {
    if (!pixels || !inBounds(x, y)) {
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

void Canvas::drawRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint32_t rgbaValue, BlendMode mode) {
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

    if (mode == BlendMode::REPLACE) {
        for (uint16_t row = y; row < y2; row++) {
            uint32_t idx = index(x, row);
            for (uint16_t col = x; col < x2; col++) {
                pixels[idx++] = rgbaValue;
            }
        }
    } else {
        for (uint16_t row = y; row < y2; row++) {
            uint32_t idx = index(x, row);
            for (uint16_t col = x; col < x2; col++) {
                switch (mode) {
                    case BlendMode::ALPHA:
                        blendAlpha(pixels[idx], rgbaValue);
                        break;
                    case BlendMode::ADDITIVE:
                        blendAdditive(pixels[idx], rgbaValue);
                        break;
                    case BlendMode::AVERAGE:
                        blendAverage(pixels[idx], rgbaValue);
                        break;
                    default:
                        break;
                }
                idx++;
            }
        }
    }
}

uint32_t Canvas::getPixel(uint16_t x, uint16_t y) const {
    if (!pixels || !inBounds(x, y)) {
        return 0;
    }
    return pixels[index(x, y)];
}

uint32_t* Canvas::getPixels() const {
    return pixels;
}

void Canvas::clear() {
    if (!pixels) {
        return;
    }
    memset(pixels, 0, size * sizeof(uint32_t));
}

void Canvas::fill(uint32_t rgbaValue) {
    if (!pixels) {
        return;
    }
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
