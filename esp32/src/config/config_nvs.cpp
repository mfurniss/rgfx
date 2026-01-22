#include "config_nvs.h"
#include "log.h"
#include <Preferences.h>

// Static Preferences instance for NVS operations
static Preferences prefs;

void ConfigNVS::begin() {
	log("Initializing NVS configuration...");

	// Note: nvs_flash_init() must be called in main.cpp BEFORE this function
	// and before any WiFi operations, as WiFi also uses NVS internally

	// Create the namespace if it doesn't exist by opening in read-write mode
	// This is required because Preferences.begin() in read-only mode cannot create namespaces
	// On a freshly erased flash, the namespace won't exist yet
	prefs.begin(NAMESPACE, false);  // Read-write mode to create namespace
	prefs.end();

	// Check if we have a saved LED config
	if (hasLEDConfig()) {
		log("Found saved LED configuration in NVS");
	} else {
		log("No saved LED configuration - waiting for Hub");
	}
}

void ConfigNVS::factoryReset() {
	log("Factory reset: Clearing NVS configuration...");

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.clear();                  // Remove all keys in namespace
	prefs.end();

	log("NVS configuration cleared");
	log("Note: WiFi credentials (IotWebConf) must be cleared separately");
}

bool ConfigNVS::saveLEDConfig(const String& configJson) {
	if (configJson.length() == 0) {
		log("ERROR: Cannot save empty LED config");
		return false;
	}

	prefs.begin(NAMESPACE, false);  // Read-write mode

	// NVS strings have a max length of ~4000 bytes
	// Check if config is too large
	if (configJson.length() > 4000) {
		log("ERROR: LED config too large for NVS (" + String(configJson.length()) + " bytes)");
		prefs.end();
		return false;
	}

	// Save config as string
	size_t bytesWritten = prefs.putString(KEY_LED_CONFIG, configJson);
	prefs.end();

	if (bytesWritten == 0) {
		log("ERROR: Failed to save LED config to NVS");
		return false;
	}

	log("LED config saved to NVS (" + String(bytesWritten) + " bytes)");
	return true;
}

String ConfigNVS::loadLEDConfig() {
	prefs.begin(NAMESPACE, true);  // Read-only mode

	String config = prefs.getString(KEY_LED_CONFIG, "");
	prefs.end();

	if (config.length() == 0) {
		log("No LED config found in NVS");
		return "";
	}

	log("Loaded LED config from NVS (" + String(config.length()) + " bytes)");
	return config;
}

bool ConfigNVS::hasLEDConfig() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	bool exists = prefs.isKey(KEY_LED_CONFIG);
	prefs.end();
	return exists;
}

void ConfigNVS::clearLEDConfig() {
	log("Clearing LED config from NVS...");

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.remove(KEY_LED_CONFIG);
	prefs.end();

	log("LED config cleared from NVS");
}

bool ConfigNVS::saveDeviceId(const String& deviceId) {
	if (deviceId.length() == 0) {
		log("ERROR: Cannot save empty device ID");
		return false;
	}

	if (deviceId.length() > 32) {
		log("ERROR: Device ID too long (max 32 characters)");
		return false;
	}

	prefs.begin(NAMESPACE, false);  // Read-write mode
	size_t bytesWritten = prefs.putString(KEY_DEVICE_ID, deviceId);
	prefs.end();

	if (bytesWritten == 0) {
		log("ERROR: Failed to save device ID to NVS");
		return false;
	}

	log("Device ID saved to NVS: " + deviceId);
	return true;
}

String ConfigNVS::loadDeviceId() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	String deviceId = prefs.getString(KEY_DEVICE_ID, "");
	prefs.end();

	if (deviceId.length() == 0) {
		return "";
	}

	return deviceId;
}

bool ConfigNVS::hasDeviceId() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	bool exists = prefs.isKey(KEY_DEVICE_ID);
	prefs.end();
	return exists;
}

bool ConfigNVS::saveLoggingLevel(const String& level) {
	if (level != "all" && level != "errors" && level != "off") {
		log("ERROR: Invalid logging level: " + level);
		return false;
	}

	prefs.begin(NAMESPACE, false);  // Read-write mode
	size_t bytesWritten = prefs.putString(KEY_LOG_LEVEL, level);
	prefs.end();

	if (bytesWritten == 0) {
		log("ERROR: Failed to save logging level to NVS");
		return false;
	}

	log("Logging level saved to NVS: " + level);
	return true;
}

String ConfigNVS::loadLoggingLevel() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	String level = prefs.getString(KEY_LOG_LEVEL, "off");
	prefs.end();

	return level;
}
