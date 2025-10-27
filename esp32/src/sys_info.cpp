#include "sys_info.h"
#include "config_leds.h"
#include "utils.h"
#include "display.h"
#include <WiFi.h>
#include <Arduino.h>

JsonDocument SysInfo::getSysInfo(Matrix& matrix) {
	JsonDocument doc;

	// Network information
	doc["ip"] = WiFi.localIP().toString();
	doc["mac"] = WiFi.macAddress();
	doc["hostname"] = Utils::getDeviceName();
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
	doc["heapSize"] = ESP.getHeapSize();
	doc["psramSize"] = ESP.getPsramSize();
	doc["freePsram"] = ESP.getFreePsram();

	// Software information
	doc["sdkVersion"] = ESP.getSdkVersion();
	doc["sketchSize"] = ESP.getSketchSize();
	doc["freeSketchSpace"] = ESP.getFreeSketchSpace();
	doc["uptimeMs"] = millis();

	// Display information
	doc["hasDisplay"] = Display::isAvailable();

	// Note: LED configuration is managed by the Hub and pushed to drivers via MQTT
	// Drivers do not report LED config - they only receive and apply it

	return doc;
}
