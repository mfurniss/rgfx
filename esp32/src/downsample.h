#pragma once

#include "canvas.h"

// Downsample source canvas to destination using 4x4 box filter
// Destination must be pre-allocated with dimensions exactly source/4
// Each destination pixel is the average of a 4x4 block of source pixels
// Pure function: does not modify source, no side effects
void downsample(const Canvas* source, Canvas* destination);
