#ifndef CONFIG_PORTAL_H
#define CONFIG_PORTAL_H

#include <Arduino.h>

// Configuration portal manager using IotWebConf
// Handles WiFi connection and persistent web-based configuration portal
class ConfigPortal {
public:
	// Initialize config portal and connect to WiFi
	// Portal remains accessible on local network IP after connection
	static void begin();

	// Process web portal requests (MUST be called in loop)
	static void process();

	// Check if WiFi is connected
	static bool isWiFiConnected();

	// Get WiFi status string
	static String getWiFiStatus();

	// Get current state name (Boot, ApMode, Connecting, OnLine, etc.)
	static String getStateName();

	// Get configured LED brightness (1-255)
	static uint8_t getLedBrightness();

	// Get configured LED data pin (GPIO number)
	static uint8_t getLedDataPin();

	// Erase saved WiFi credentials (factory reset)
	static void resetSettings();
};

#endif
