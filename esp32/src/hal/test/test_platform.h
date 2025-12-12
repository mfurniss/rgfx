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
 * Set the mock time to an absolute value.
 * hal::millis() will return this value.
 */
void setTime(uint32_t ms);

/**
 * Advance the mock time by the specified amount.
 * Equivalent to setTime(current + ms).
 */
void advanceTime(uint32_t ms);

/**
 * Seed the random number generator for reproducible tests.
 * hal::random() will produce deterministic values.
 */
void seedRandom(uint16_t seed);

}  // namespace test
}  // namespace hal
