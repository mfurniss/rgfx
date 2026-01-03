/**
 * Platform Abstraction Layer
 *
 * Provides platform-agnostic timing, random number generation, and logging.
 * Implementation is provided by platform-specific .cpp files:
 *   - hal/esp32/platform.cpp   (Arduino/ESP-IDF)
 *   - hal/native/platform.cpp  (std::chrono, std::random)
 *   - hal/test/platform.cpp    (controllable mocks)
 */
#pragma once

#include <cstddef>
#include <cstdint>

namespace hal {

/**
 * Get milliseconds since program start
 */
uint32_t millis();

/**
 * Get microseconds since program start
 */
uint32_t micros();

/**
 * Delay execution for specified milliseconds
 * Note: On native platform, this may yield to other threads
 */
void delay(uint32_t ms);

/**
 * Generate random number in range [0, max)
 */
int32_t random(int32_t max);

/**
 * Generate random number in range [min, max)
 */
int32_t random(int32_t min, int32_t max);

/**
 * Log a debug message (printf-style)
 * May be no-op on release builds or resource-constrained platforms
 */
void log(const char* fmt, ...);

/**
 * Get available heap memory in bytes
 */
size_t getFreeHeap();

/**
 * Get largest contiguous free block in bytes
 */
size_t getLargestFreeBlock();

}  // namespace hal
