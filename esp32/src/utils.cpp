#include "utils.h"
#include "config/config_nvs.h"
#include <WiFi.h>

String Utils::getDeviceId() {
	// Priority 1: Load custom ID from NVS if exists
	if (ConfigNVS::hasDeviceId()) {
		String customId = ConfigNVS::loadDeviceId();
		if (customId.length() > 0) {
			return customId;
		}
	}

	// Priority 2: Fall back to MAC-based ID (last 6 hex chars)
	String mac = WiFi.macAddress();
	mac.replace(":", "");
	mac = mac.substring(mac.length() - 6);
	mac.toLowerCase();
	return mac;
}

String Utils::getDeviceName() {
	return "rgfx-driver-" + getDeviceId();
}

void Utils::setDeviceId(const String& deviceId) {
	ConfigNVS::saveDeviceId(deviceId);
}
