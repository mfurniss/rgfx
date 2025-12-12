/**
 * Native Platform Implementation
 *
 * Uses standard C++ libraries for timing and random number generation.
 * For use with the LED simulator on macOS/Linux.
 */
#include "hal/platform.h"
#include <chrono>
#include <cstdarg>
#include <cstdio>
#include <random>
#include <thread>

namespace hal {

// Start time for millis() calculation
static auto g_startTime = std::chrono::steady_clock::now();

// Random number generator
static std::mt19937 g_rng(std::random_device{}());

uint32_t millis() {
	auto now = std::chrono::steady_clock::now();
	auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - g_startTime);
	return static_cast<uint32_t>(elapsed.count());
}

void delay(uint32_t ms) {
	std::this_thread::sleep_for(std::chrono::milliseconds(ms));
}

int32_t random(int32_t max) {
	if (max <= 0) return 0;
	std::uniform_int_distribution<int32_t> dist(0, max - 1);
	return dist(g_rng);
}

int32_t random(int32_t min, int32_t max) {
	if (max <= min) return min;
	std::uniform_int_distribution<int32_t> dist(min, max - 1);
	return dist(g_rng);
}

void log(const char* fmt, ...) {
	va_list args;
	va_start(args, fmt);
	vprintf(fmt, args);
	printf("\n");
	va_end(args);
}

}  // namespace hal
