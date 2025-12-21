#include "telemetry.h"
#include "utils.h"
#include "oled/oled_display.h"
#include "version.h"
#include "crash_handler.h"
#include "network/mqtt.h"
#include "network/udp.h"
#include <WiFi.h>
#include <Arduino.h>

JsonDocument Telemetry::getTelemetry(const DriverConfigData& driverConfig, bool configReceived) {
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
	doc["maxAllocHeap"] = ESP.getMaxAllocHeap();
	doc["psramSize"] = ESP.getPsramSize();
	doc["freePsram"] = ESP.getFreePsram();

	// Software information
	doc["firmwareVersion"] = RGFX_VERSION;
	doc["sdkVersion"] = ESP.getSdkVersion();
	doc["sketchSize"] = ESP.getSketchSize();
	doc["freeSketchSpace"] = ESP.getFreeSketchSpace();
	doc["uptimeMs"] = millis();

	// Crash/reset information
	const CrashInfo& crash = getCrashInfo();
	doc["lastResetReason"] = getResetReasonString(crash.lastResetReason);
	doc["crashCount"] = crash.crashCount;

	// Display information
	doc["hasDisplay"] = Display::isAvailable();

	// Test mode state
	doc["testActive"] = testModeActive.load();

	// Message statistics
	doc["mqttMessagesReceived"] = mqttMessagesReceived;
	doc["udpMessagesReceived"] = udpMessagesReceived;
	doc["udpMessagesDropped"] = udpMessagesDropped;

	// FPS metrics
	doc["currentFps"] = getCurrentFps();
	doc["minFps"] = getMinFps();
	doc["maxFps"] = getMaxFps();

	// Note: LED config is NOT included in telemetry - Hub already has it
	// Including it would exceed the 1024 byte MQTT buffer limit
	(void)driverConfig;
	(void)configReceived;

	return doc;
}
