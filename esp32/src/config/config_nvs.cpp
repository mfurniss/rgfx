#include "config_nvs.h"
#include "log.h"
#include <Preferences.h>

// Static Preferences instance for NVS operations
static Preferences prefs;

void ConfigNVS::begin() {
	log("Initializing NVS configuration...");

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
