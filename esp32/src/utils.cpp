#include "utils.h"
#include "config/config_nvs.h"
#include <WiFi.h>

String Utils::getDeviceId() {
	// Load ID from NVS - this MUST exist
	if (ConfigNVS::hasDeviceId()) {
		String deviceId = ConfigNVS::loadDeviceId();
		if (deviceId.length() > 0) {
			return deviceId;
		}
	}

	// NO FALLBACK - driver must have ID set via set-id command
	// Return empty string to signal error
	return "";
}


void Utils::setDeviceId(const String& deviceId) {
	ConfigNVS::saveDeviceId(deviceId);
}
