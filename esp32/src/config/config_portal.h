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

	// Erase saved WiFi credentials (factory reset)
	static void resetSettings();

	// Set WiFi credentials via serial (bypasses web portal)
	// Returns true if credentials were set successfully
	static bool setWiFiCredentials(const String& ssid, const String& password);

	// Get current WiFi SSID from configuration
	static String getWiFiSsid();

	// Get current WiFi password from configuration
	static String getWiFiPassword();

   private:
	// Validate that a configuration string contains only printable characters
	// Returns false if string is empty, too long, or contains non-printable chars
	static bool isValidConfigString(const char* str, size_t maxLen);
};

#endif
