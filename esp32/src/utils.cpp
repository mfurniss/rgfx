#include "utils.h"
#include <WiFi.h>

// Get stable 6-character device ID from MAC address
String Utils::getDeviceId() {
	// Get MAC address (format: "AA:BB:CC:DD:EE:FF")
	String mac = WiFi.macAddress();

	// Take last 6 hex chars from MAC (last 3 bytes: "DD:EE:FF" -> "ddeeff")
	// Remove colons, get last 6 characters, and lowercase
	mac.replace(":", "");
	mac = mac.substring(mac.length() - 6);
	mac.toLowerCase();
	return mac;
}

// Get full device name with prefix
String Utils::getDeviceName() {
	return "rgfx-driver-" + getDeviceId();
}
