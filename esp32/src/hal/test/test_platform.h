/**
 * Test Platform Header
 *
 * Exposes test helpers for controlling time and RNG in unit tests.
 */
#pragma once

#include <cstdint>

namespace hal {
namespace test {

/**
 * Set the mock time to an absolute value (milliseconds).
 * hal::millis() will return this value.
 * hal::micros() will return ms * 1000.
 */
void setTime(uint32_t ms);

/**
 * Set the mock time to an absolute value (microseconds).
 * hal::micros() will return this value.
 * hal::millis() will return us / 1000.
 */
void setTimeMicros(uint32_t us);

/**
 * Advance the mock time by the specified amount (milliseconds).
 * Both millis() and micros() are updated.
 */
void advanceTime(uint32_t ms);

/**
 * Advance the mock time by the specified amount (microseconds).
 * Both millis() and micros() are updated.
 */
void advanceTimeMicros(uint32_t us);

/**
 * Seed the random number generator for reproducible tests.
 * hal::random() will produce deterministic values.
 */
void seedRandom(uint16_t seed);

/**
 * Set the mock free heap size for testing memory limits.
 * hal::getFreeHeap() will return this value.
 */
void setFreeHeap(size_t bytes);

/**
 * Set the mock largest free block size for testing memory limits.
 * hal::getLargestFreeBlock() will return this value.
 */
void setLargestFreeBlock(size_t bytes);

}  // namespace test
}  // namespace hal
