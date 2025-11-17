/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_DISPLAY_H
#define MOCK_DISPLAY_H

#ifdef UNIT_TEST

#include <string>
#include <cstdint>

/**
 * Mock Display Module for Unit Testing
 *
 * Simulates the OLED display (SSD1306) without requiring actual hardware.
 * Mirrors the API from src/oled/oled_display.h for use in native tests.
 *
 * Usage:
 *   #ifdef UNIT_TEST
 *   #include "test/mocks/mock_display.h"
 *   #else
 *   #include "oled/oled_display.h"
 *   #endif
 *
 * Features:
 *   - All methods are no-ops (display updates are purely visual)
 *   - begin() always returns true (display available)
 *   - isAvailable() always returns true
 *   - Optional: Can be extended to track last screen state for assertions
 */

namespace Display {

	/**
	 * Initialize mock display (always succeeds)
	 */
	inline bool begin() {
		return true;
	}

	/**
	 * Check if mock display is available (always true)
	 */
	inline bool isAvailable() {
		return true;
	}

	/**
	 * Show boot screen (no-op)
	 */
	inline void showBoot(const std::string& deviceName) {
		// No-op: Visual display not testable in unit tests
		(void)deviceName;
	}

	/**
	 * Show WiFi connecting screen (no-op)
	 */
	inline void showConnecting(const std::string& ssid, const std::string& deviceName) {
		// No-op: Visual display not testable in unit tests
		(void)ssid;
		(void)deviceName;
	}

	/**
	 * Show AP mode screen (no-op)
	 */
	inline void showAPMode(const std::string& apName) {
		// No-op: Visual display not testable in unit tests
		(void)apName;
	}

	/**
	 * Update AP mode countdown timer (no-op)
	 */
	inline void updateAPModeCountdown(uint16_t secondsRemaining) {
		// No-op: Visual display not testable in unit tests
		(void)secondsRemaining;
	}

	/**
	 * Show connected screen (no-op)
	 */
	inline void showConnected(const std::string& ssid, const std::string& ip, bool mqttConnected,
	                          const std::string& deviceName) {
		// No-op: Visual display not testable in unit tests
		(void)ssid;
		(void)ip;
		(void)mqttConnected;
		(void)deviceName;
	}

	/**
	 * Update MQTT connection status (no-op)
	 */
	inline void updateMQTTStatus(bool connected) {
		// No-op: Visual display not testable in unit tests
		(void)connected;
	}

	/**
	 * Update uptime display (no-op)
	 */
	inline void updateUptime(unsigned long uptimeSeconds) {
		// No-op: Visual display not testable in unit tests
		(void)uptimeSeconds;
	}

	/**
	 * Clear display (no-op)
	 */
	inline void clear() {
		// No-op: Visual display not testable in unit tests
	}

}  // namespace Display

#endif  // UNIT_TEST
#endif  // MOCK_DISPLAY_H
