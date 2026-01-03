/**
 * ESP32 Platform Implementation
 *
 * Wraps Arduino/ESP-IDF functions for the HAL platform interface.
 */
#include "hal/platform.h"
#include <Arduino.h>
#include <cstdarg>

namespace hal {

uint32_t millis() {
	return ::millis();
}

uint32_t micros() {
	return ::micros();
}

void delay(uint32_t ms) {
	::delay(ms);
}

int32_t random(int32_t max) {
	return ::random(max);
}

int32_t random(int32_t min, int32_t max) {
	return ::random(min, max);
}

void log(const char* fmt, ...) {
	va_list args;
	va_start(args, fmt);

	char buffer[256];
	vsnprintf(buffer, sizeof(buffer), fmt, args);
	Serial.println(buffer);

	va_end(args);
}

size_t getFreeHeap() {
	return ESP.getFreeHeap();
}

size_t getLargestFreeBlock() {
	return ESP.getMaxAllocHeap();
}

}  // namespace hal
