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
