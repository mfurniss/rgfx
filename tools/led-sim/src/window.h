/**
 * Window Sizing
 *
 * Calculates optimal window dimensions for given LED configuration.
 */
#pragma once

#include <cstdint>

/**
 * Calculate optimal window size for LED dimensions.
 *
 * @param ledWidth Number of LEDs horizontally
 * @param ledHeight Number of LEDs vertically
 * @param windowWidth Output: calculated window width
 * @param windowHeight Output: calculated window height
 * @param ledSize Output: pixel size of each LED
 * @param ledGap Output: gap between LEDs
 */
void calculateWindowSize(uint16_t ledWidth, uint16_t ledHeight,
                         int& windowWidth, int& windowHeight,
                         float& ledSize, float& ledGap);
