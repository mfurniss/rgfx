/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_WIRE_H
#define MOCK_WIRE_H

#ifdef UNIT_TEST

#include <cstdint>

/**
 * Mock Wire (I2C) Library for Unit Testing
 *
 * Simulates the Arduino Wire library (TwoWire class) without requiring I2C hardware.
 * Mirrors the API from Wire.h for use in native tests.
 *
 * Usage:
 *   #ifdef UNIT_TEST
 *   #include "test/mocks/mock_wire.h"
 *   #else
 *   #include <Wire.h>
 *   #endif
 *
 * Features:
 *   - begin() always succeeds
 *   - setClock() is a no-op
 *   - beginTransmission() and endTransmission() are no-ops
 *   - write() returns 1 (success)
 *   - read() returns 0
 *   - All methods designed to allow I2C-dependent code to compile and run
 */

class TwoWire {
   public:
	/**
	 * Initialize I2C with default pins
	 */
	void begin() {}

	/**
	 * Initialize I2C with custom SDA and SCL pins
	 */
	void begin(int sda, int scl) {
		(void)sda;
		(void)scl;
	}

	/**
	 * Set I2C clock frequency
	 */
	void setClock(uint32_t frequency) { (void)frequency; }

	/**
	 * Begin transmission to I2C device
	 */
	void beginTransmission(uint8_t address) { (void)address; }

	/**
	 * End transmission and return status
	 * @return 0 for success (mock always succeeds)
	 */
	uint8_t endTransmission() { return 0; }

	/**
	 * End transmission with stop flag
	 * @param sendStop true to send stop condition
	 * @return 0 for success (mock always succeeds)
	 */
	uint8_t endTransmission(bool sendStop) {
		(void)sendStop;
		return 0;
	}

	/**
	 * Write a single byte
	 * @return 1 (success)
	 */
	size_t write(uint8_t data) {
		(void)data;
		return 1;
	}

	/**
	 * Write multiple bytes
	 * @return number of bytes written
	 */
	size_t write(const uint8_t* data, size_t length) {
		(void)data;
		return length;
	}

	/**
	 * Request bytes from I2C device
	 * @return number of bytes requested
	 */
	uint8_t requestFrom(uint8_t address, uint8_t quantity) {
		(void)address;
		return quantity;
	}

	/**
	 * Request bytes with stop flag
	 * @return number of bytes requested
	 */
	uint8_t requestFrom(uint8_t address, uint8_t quantity, bool sendStop) {
		(void)address;
		(void)sendStop;
		return quantity;
	}

	/**
	 * Read a single byte
	 * @return 0 (mock always returns 0)
	 */
	int read() { return 0; }

	/**
	 * Check how many bytes are available to read
	 * @return 0 (mock has no data)
	 */
	int available() { return 0; }
};

// Global Wire instance
static TwoWire Wire;

#endif  // UNIT_TEST
#endif  // MOCK_WIRE_H
