#pragma once
#include "../matrix.h"

/**
 * LED Test Effect
 *
 * Displays a test pattern to validate LEDs are working and
 * that matrix serpentine coordinate conversions are correct.
 *
 * Strip layout: 25% segments of Red, Green, Blue, Yellow
 * Matrix layout: 4 quadrants (TL=Red, TR=Green, BL=Blue, BR=Yellow)
 */
void test(Matrix& matrix, uint32_t color);
