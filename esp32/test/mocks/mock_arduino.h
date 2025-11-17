/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_ARDUINO_H
#define MOCK_ARDUINO_H

#ifdef UNIT_TEST

#include <string>
#include <cstdint>

/**
 * Mock Arduino Core Functions for Unit Testing
 *
 * Provides minimal Arduino API implementations for native testing.
 * Mocks core functions like millis(), delay(), Serial, etc.
 *
 * Usage:
 *   #ifdef UNIT_TEST
 *   #include "test/mocks/mock_arduino.h"
 *   #else
 *   #include <Arduino.h>
 *   #endif
 *
 * Features:
 *   - millis() returns 0 (can be extended to simulate time)
 *   - delay() is a no-op (instant)
 *   - Serial is a mock class with no-op print methods
 *   - pinMode, digitalWrite, digitalRead are no-ops
 */

/**
 * Mock millis() - returns elapsed time in milliseconds
 * Currently returns 0, can be extended to simulate time progression
 */
inline unsigned long millis() {
	return 0;
}

/**
 * Mock delay() - blocks for specified milliseconds
 * No-op in tests (instant)
 */
inline void delay(unsigned long ms) {
	(void)ms;
}

/**
 * Mock delayMicroseconds() - blocks for specified microseconds
 * No-op in tests (instant)
 */
inline void delayMicroseconds(unsigned int us) {
	(void)us;
}

/**
 * Mock pinMode() - configure pin mode
 * No-op in tests (no GPIO)
 */
inline void pinMode(uint8_t pin, uint8_t mode) {
	(void)pin;
	(void)mode;
}

/**
 * Mock digitalWrite() - write digital value to pin
 * No-op in tests (no GPIO)
 */
inline void digitalWrite(uint8_t pin, uint8_t value) {
	(void)pin;
	(void)value;
}

/**
 * Mock digitalRead() - read digital value from pin
 * Always returns LOW in tests
 */
inline int digitalRead(uint8_t pin) {
	(void)pin;
	return 0;  // LOW
}

// Pin mode constants
#define INPUT 0x0
#define OUTPUT 0x1
#define INPUT_PULLUP 0x2
#define INPUT_PULLDOWN 0x3

// Digital pin values
#define LOW 0x0
#define HIGH 0x1

/**
 * Mock Serial class for debugging output
 * All methods are no-ops
 */
class SerialClass {
   public:
	void begin(unsigned long baud) { (void)baud; }

	void end() {}

	size_t print(const char* str) {
		(void)str;
		return 0;
	}

	size_t print(const std::string& str) {
		(void)str;
		return 0;
	}

	size_t print(int n) {
		(void)n;
		return 0;
	}

	size_t print(unsigned int n) {
		(void)n;
		return 0;
	}

	size_t print(long n) {
		(void)n;
		return 0;
	}

	size_t print(unsigned long n) {
		(void)n;
		return 0;
	}

	size_t println(const char* str) {
		(void)str;
		return 0;
	}

	size_t println(const std::string& str) {
		(void)str;
		return 0;
	}

	size_t println(int n) {
		(void)n;
		return 0;
	}

	size_t println(unsigned int n) {
		(void)n;
		return 0;
	}

	size_t println(long n) {
		(void)n;
		return 0;
	}

	size_t println(unsigned long n) {
		(void)n;
		return 0;
	}

	size_t println() { return 0; }

	int available() { return 0; }

	int read() { return -1; }

	void flush() {}
};

// Global Serial instance
static SerialClass Serial;

#endif  // UNIT_TEST
#endif  // MOCK_ARDUINO_H
