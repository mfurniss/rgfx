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

namespace hal {

// Controllable mock time (milliseconds and microseconds)
static uint32_t g_mockTimeMs = 0;
static uint32_t g_mockTimeUs = 0;

// Portable xorshift32 RNG for cross-platform reproducibility
// Unlike srand/rand, this produces identical sequences on macOS and Linux
static uint32_t g_xorshift_state = 12345;

// Mock heap memory for testing memory limits
static size_t g_mockFreeHeap = 320000;
static size_t g_mockLargestBlock = 100000;

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

// xorshift32 step - produces next random value
static uint32_t xorshift32() {
	g_xorshift_state ^= g_xorshift_state << 13;
	g_xorshift_state ^= g_xorshift_state >> 17;
	g_xorshift_state ^= g_xorshift_state << 5;
	return g_xorshift_state;
}

int32_t random(int32_t max) {
	if (max <= 0) return 0;
	return static_cast<int32_t>(xorshift32() % static_cast<uint32_t>(max));
}

int32_t random(int32_t min, int32_t max) {
	if (max <= min) return min;
	return min + static_cast<int32_t>(xorshift32() % static_cast<uint32_t>(max - min));
}

void log(const char* fmt, ...) {
	va_list args;
	va_start(args, fmt);
	vprintf(fmt, args);
	printf("\n");
	va_end(args);
}

size_t getFreeHeap() {
	return g_mockFreeHeap;
}

size_t getLargestFreeBlock() {
	return g_mockLargestBlock;
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
	// xorshift32 cannot have zero state, so use 1 as fallback
	g_xorshift_state = seed ? seed : 1;
}

void setFreeHeap(size_t bytes) {
	g_mockFreeHeap = bytes;
}

void setLargestFreeBlock(size_t bytes) {
	g_mockLargestBlock = bytes;
}

}  // namespace test

}  // namespace hal
