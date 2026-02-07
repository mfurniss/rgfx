#include "telemetry.h"
#include "utils.h"
#include "version.h"
#include "crash_handler.h"
#include "network/mqtt.h"
#include "network/udp.h"
#include "effects/effect_processor.h"
#include <WiFi.h>
#include <Arduino.h>

JsonDocument Telemetry::getTelemetry() {
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

	// Test mode state
	doc["testActive"] = testModeActive.load();

	// Message statistics
	doc["mqttMessagesReceived"] = mqttMessagesReceived;
	doc["udpMessagesReceived"] = udpMessagesReceived;
	doc["udpMessagesDropped"] = udpMessagesDropped;
	doc["udpQueueDepth"] = getUdpQueueDepth();

	// FPS metrics
	doc["currentFps"] = getCurrentFps();
	doc["minFps"] = getMinFps();
	doc["maxFps"] = getMaxFps();

	// Frame timing metrics (microseconds per frame, averaged)
	FrameTimingMetrics timing = getFrameTimingMetrics();
	JsonObject frameTiming = doc["frameTiming"].to<JsonObject>();
	frameTiming["clearUs"] = timing.clearUs;
	frameTiming["effectsUs"] = timing.effectsUs;
	frameTiming["downsampleUs"] = timing.downsampleUs;
	frameTiming["showUs"] = timing.showUs;
	frameTiming["totalUs"] = timing.totalUs;

	return doc;
}
