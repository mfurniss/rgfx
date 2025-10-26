#include "config_nvs.h"
#include "log.h"
#include <Preferences.h>

// Static Preferences instance for NVS operations
static Preferences prefs;

void ConfigNVS::begin() {
	log("Initializing NVS configuration...");
	log("Note: LED hardware config is managed by Hub (via MQTT)");
	log("Note: WiFi credentials managed by IotWebConf");
}

void ConfigNVS::factoryReset() {
	log("Factory reset: Clearing NVS configuration...");

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.clear();  // Remove all keys in namespace
	prefs.end();

	log("NVS configuration cleared");
	log("Note: WiFi credentials (IotWebConf) must be cleared separately");
}
