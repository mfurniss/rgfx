#include "sys_info.h"
#include "config_leds.h"
#include <WiFi.h>
#include <ESP.h>

JsonDocument SysInfo::getSysInfo(Matrix& matrix) {
	JsonDocument doc;

	// Network information
	doc["ip"] = WiFi.localIP().toString();
	doc["mac"] = WiFi.macAddress();
	doc["hostname"] = WiFi.getHostname();
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

	// LED configuration
	doc["ledCount"] = matrix.size;
	doc["matrixWidth"] = matrix.width;
	doc["matrixHeight"] = matrix.height;
	doc["ledDataPin"] = ConfigLeds::getDataPin();
	doc["ledBrightness"] = ConfigLeds::getBrightness();
	doc["ledMaxBrightness"] = 255;
	doc["ledChipset"] = "WS2812B";
	doc["ledColorOrder"] = "GRB";

	return doc;
}
