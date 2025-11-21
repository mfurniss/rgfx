#include "utils.h"
#include "config/config_nvs.h"
#include <WiFi.h>

String Utils::getDeviceId() {
	// Load ID from NVS if available
	if (ConfigNVS::hasDeviceId()) {
		String deviceId = ConfigNVS::loadDeviceId();
		if (deviceId.length() > 0) {
			return deviceId;
		}
	}

	// Fallback: use MAC address for temporary hostname until Hub assigns ID
	// This ensures OTA works immediately after flashing via serial
	String mac = WiFi.macAddress();
	mac.replace(":", "");
	mac.toLowerCase();
	return "rgfx-driver-" + mac;
}


void Utils::setDeviceId(const String& deviceId) {
	ConfigNVS::saveDeviceId(deviceId);
}
