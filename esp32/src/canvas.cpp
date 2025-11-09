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

void Canvas::setPixel(uint16_t x, uint16_t y, uint32_t rgbaValue) {
    if (!inBounds(x, y)) {
        return;
    }
    pixels[index(x, y)] = rgbaValue;
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
