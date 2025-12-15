/**
 * Test Platform Implementation
 *
 * Provides controllable mocks for unit testing.
 * Time can be manually advanced, RNG is seeded for reproducibility.
 */
#include "hal/platform.h"
#include "hal/test/test_platform.h"
#include <cstdarg>
#include <cstdio>
#include <cstdlib>

namespace hal {

// Controllable mock time (milliseconds and microseconds)
static uint32_t g_mockTimeMs = 0;
static uint32_t g_mockTimeUs = 0;

// Seeded RNG for reproducible tests
static uint16_t g_seed = 12345;

uint32_t millis() {
	return g_mockTimeMs;
}

uint32_t micros() {
	return g_mockTimeUs;
}

void delay(uint32_t ms) {
	g_mockTimeMs += ms;
	g_mockTimeUs += ms * 1000;
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
	g_mockTimeMs = ms;
	g_mockTimeUs = ms * 1000;
}

void setTimeMicros(uint32_t us) {
	g_mockTimeUs = us;
	g_mockTimeMs = us / 1000;
}

void advanceTime(uint32_t ms) {
	g_mockTimeMs += ms;
	g_mockTimeUs += ms * 1000;
}

void advanceTimeMicros(uint32_t us) {
	g_mockTimeUs += us;
	g_mockTimeMs = g_mockTimeUs / 1000;
}

void seedRandom(uint16_t seed) {
	g_seed = seed;
	srand(seed);
}

}  // namespace test

}  // namespace hal
