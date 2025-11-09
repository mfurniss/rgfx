#include "downsample.h"
#include <cassert>

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

            uint32_t rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            for (uint16_t y = 0; y < 4; y++) {
                for (uint16_t x = 0; x < 4; x++) {
                    uint32_t pixel = source->getPixel(sx + x, sy + y);
                    rSum += RGBA_RED(pixel);
                    gSum += RGBA_GREEN(pixel);
                    bSum += RGBA_BLUE(pixel);
                    aSum += RGBA_ALPHA(pixel);
                }
            }

            uint32_t r = rSum >> 4;
            uint32_t g = gSum >> 4;
            uint32_t b = bSum >> 4;
            uint32_t a = aSum >> 4;

            destination->setPixel(dx, dy, RGBA(r, g, b, a));
        }
    }
}
