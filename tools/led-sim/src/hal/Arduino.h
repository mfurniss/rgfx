// Arduino.h stub for native builds
// Provides minimal Arduino compatibility for IntelliSense and compilation
#pragma once

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <algorithm>

// Arduino types
using byte = uint8_t;

// Arduino timing (implemented in platform.cpp)
unsigned long millis();
void delay(unsigned long ms);

// Arduino math macros
#ifndef min
#define min(a, b) ((a) < (b) ? (a) : (b))
#endif
#ifndef max
#define max(a, b) ((a) > (b) ? (a) : (b))
#endif
#ifndef constrain
#define constrain(x, low, high) ((x) < (low) ? (low) : ((x) > (high) ? (high) : (x)))
#endif
#ifndef map
inline long map(long x, long in_min, long in_max, long out_min, long out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
#endif

// Random
#ifndef random
inline long random(long max) { return rand() % max; }
inline long random(long min, long max) { return min + rand() % (max - min); }
#endif
