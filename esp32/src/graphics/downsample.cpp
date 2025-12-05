#include "downsample.h"
#include <cassert>
#ifndef UNIT_TEST
#include <FastLED.h>
#endif

void downsample(const Canvas* source, Canvas* destination) {
    assert(source != nullptr && "Source canvas cannot be null");
    assert(destination != nullptr && "Destination canvas cannot be null");

    uint16_t srcWidth = source->getWidth();
    uint16_t srcHeight = source->getHeight();
    uint16_t dstWidth = destination->getWidth();
    uint16_t dstHeight = destination->getHeight();

    assert(dstWidth == srcWidth / 4 && "Destination width must be 1/4 source width");
    assert(dstHeight == srcHeight / 4 && "Destination height must be 1/4 source height");

    destination->clear();

    for (uint16_t dy = 0; dy < dstHeight; dy++) {
        for (uint16_t dx = 0; dx < dstWidth; dx++) {
            uint16_t sx = dx * 4;
            uint16_t sy = dy * 4;

            uint16_t rSum = 0, gSum = 0, bSum = 0;

            for (uint16_t y = 0; y < 4; y++) {
                for (uint16_t x = 0; x < 4; x++) {
                    CRGB pixel = source->getPixel(sx + x, sy + y);
                    rSum += pixel.r;
                    gSum += pixel.g;
                    bSum += pixel.b;
                }
            }

            uint8_t r = rSum >> 4;
            uint8_t g = gSum >> 4;
            uint8_t b = bSum >> 4;

            destination->drawPixel(dx, dy, CRGB(r, g, b));
        }
    }
}
