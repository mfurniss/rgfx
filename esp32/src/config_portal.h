#ifndef CONFIG_PORTAL_H
#define CONFIG_PORTAL_H

#include <Arduino.h>

// Helper function to generate unique AP name
String generateAPName();

// Configuration portal manager
// Handles WiFi connection and web-based configuration portal
class ConfigPortal {
public:
	// Initialize config portal and connect to WiFi
	// Returns true if WiFi connected, false if failed or in portal mode
	static bool begin();

	// Check if WiFi is connected
	static bool isWiFiConnected();

	// Get WiFi status string
	static String getWiFiStatus();

	// Force open config portal (for debugging/reconfiguration)
	static void openPortal();

	// Erase saved WiFi credentials (factory reset)
	static void resetSettings();

	// Process web portal requests (call in loop)
	static void process();
};

#endif
