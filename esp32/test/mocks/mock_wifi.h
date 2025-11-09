/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_WIFI_H
#define MOCK_WIFI_H

#ifdef UNIT_TEST

#include <string>

/**
 * Mock WiFi class for native testing
 * Simulates basic WiFi functionality without actual hardware
 */
class WiFiClass {
  public:
	static std::string macAddress() {
		// Return a mock MAC address for testing
		return "AA:BB:CC:DD:EE:FF";
	}
};

// Global WiFi instance (mimics Arduino WiFi library)
static WiFiClass WiFi;

#endif // UNIT_TEST
#endif // MOCK_WIFI_H
