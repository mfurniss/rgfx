#include "sys_info.h"
#include "utils.h"
#include "oled/oled_display.h"
#include "version.h"
#include <WiFi.h>
#include <Arduino.h>

// External test mode state
extern volatile bool testModeActive;

JsonDocument SysInfo::getSysInfo(const DriverConfigData& driverConfig, bool configReceived) {
	JsonDocument doc;

	// Network information
	doc["ip"] = WiFi.localIP().toString();
	doc["mac"] = WiFi.macAddress();
	doc["hostname"] = Utils::getDeviceId();
	doc["rssi"] = WiFi.RSSI();
	doc["ssid"] = WiFi.SSID();

	// Chip information
	doc["chipModel"] = ESP.getChipModel();
	doc["chipRevision"] = ESP.getChipRevision();
	doc["chipCores"] = ESP.getChipCores();
	doc["cpuFreqMHz"] = ESP.getCpuFreqMHz();

	// Memory information
	doc["flashSize"] = ESP.getFlashChipSize();
	doc["flashSpeed"] = ESP.getFlashChipSpeed();
	doc["freeHeap"] = ESP.getFreeHeap();
	doc["minFreeHeap"] = ESP.getMinFreeHeap();
	doc["heapSize"] = ESP.getHeapSize();
	doc["psramSize"] = ESP.getPsramSize();
	doc["freePsram"] = ESP.getFreePsram();

	// Software information
	doc["firmwareVersion"] = RGFX_VERSION;
	doc["sdkVersion"] = ESP.getSdkVersion();
	doc["sketchSize"] = ESP.getSketchSize();
	doc["freeSketchSpace"] = ESP.getFreeSketchSpace();
	doc["uptimeMs"] = millis();

	// Display information
	doc["hasDisplay"] = Display::isAvailable();

	// Test mode state
	doc["testActive"] = testModeActive;

	// LED Configuration (if received from Hub)
	doc["configReceived"] = configReceived;

	if (configReceived) {
		JsonObject ledConfig = doc["ledConfig"].to<JsonObject>();

		ledConfig["name"] = driverConfig.name;
		ledConfig["description"] = driverConfig.description;
		ledConfig["version"] = driverConfig.version;
		ledConfig["globalBrightnessLimit"] = driverConfig.globalBrightnessLimit;
		ledConfig["dithering"] = driverConfig.dithering;
		ledConfig["updateRate"] = driverConfig.updateRate;

		// LED devices array
		JsonArray devices = ledConfig["devices"].to<JsonArray>();

		for (const auto& device : driverConfig.devices) {
			JsonObject dev = devices.add<JsonObject>();
			dev["id"] = device.id;
			dev["name"] = device.name;
			dev["pin"] = device.pin;
			dev["layout"] = device.layout;
			dev["count"] = device.count;
			dev["offset"] = device.offset;
			dev["chipset"] = device.chipset;
			dev["colorOrder"] = device.colorOrder;
			dev["maxBrightness"] = device.maxBrightness;
			dev["colorCorrection"] = device.colorCorrection;

			if (device.width > 0 && device.height > 0) {
				dev["width"] = device.width;
				dev["height"] = device.height;
			}
		}
	}

	return doc;
}
