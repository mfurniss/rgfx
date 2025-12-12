/**
 * Test Platform Implementation
 *
 * Provides controllable mocks for unit testing.
 * Time can be manually advanced, RNG is seeded for reproducibility.
 */
#include "hal/platform.h"
#include <cstdarg>
#include <cstdio>
#include <cstdlib>

namespace hal {

// Controllable mock time
static uint32_t g_mockTime = 0;

// Seeded RNG for reproducible tests
static uint16_t g_seed = 12345;

uint32_t millis() {
	return g_mockTime;
}

void delay(uint32_t ms) {
	g_mockTime += ms;
}

int32_t random(int32_t max) {
	if (max <= 0) return 0;
	return rand() % max;
}

int32_t random(int32_t min, int32_t max) {
	if (max <= min) return min;
	return min + (rand() % (max - min));
}

void log(const char* fmt, ...) {
	va_list args;
	va_start(args, fmt);
	vprintf(fmt, args);
	printf("\n");
	va_end(args);
}

// Test helpers (not part of HAL interface)
namespace test {

void setTime(uint32_t ms) {
	g_mockTime = ms;
}

void advanceTime(uint32_t ms) {
	g_mockTime += ms;
}

void seedRandom(uint16_t seed) {
	g_seed = seed;
	srand(seed);
}

}  // namespace test

}  // namespace hal
