/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "network/network_task.h"
#include <ArduinoOTA.h>
#include "config/config_portal.h"
#include "config/constants.h"
#include "log.h"
#include "network/mqtt.h"
#include "network/network_init.h"
#include "oled/oled_display.h"
#include "telemetry.h"
#include "utils.h"

// Forward declaration for log queue processing (defined in log.cpp)
void processLogQueue();

// Network Task - runs on Core 0 (protocol core)
// Handles MQTT, web server, OTA, and OLED display updates
void networkTask(void* parameter) {
	log("Network task started on Core " + String(xPortGetCoreID()));

	// Initialize OLED display (optional - gracefully handles missing display)
	bool hasDisplay = Display::begin();
	if (hasDisplay) {
		log("OLED display available - status display enabled");
		Display::showBoot(Utils::getDeviceId());
		delay(2000);  // Show boot screen for 2 seconds
	} else {
		log("Running without OLED display");
	}

	// Wait for setup to complete initialization
	delay(500);

	// Track last uptime update for periodic display refresh
	unsigned long lastUptimeUpdate = 0;

	// Track last SSDP discovery poll
	unsigned long lastSsdpPoll = 0;

	// Track last telemetry broadcast
	unsigned long lastTelemetryBroadcast = 0;

	// Track last stack check time
	unsigned long lastStackCheck = 0;
	const unsigned long STACK_CHECK_INTERVAL_MS = 30000;  // Check every 30 seconds
	const UBaseType_t STACK_WARNING_THRESHOLD = 1024;     // Warn if below 1KB remaining

	// Main network task loop
	while (true) {
		// Process config portal web requests (MUST be called regularly)
		ConfigPortal::process();

		// Handle MQTT independently (only needs WiFi)
		bool isConnected = ConfigPortal::isWiFiConnected();

		// Skip MQTT/UDP processing during OTA
		if (isConnected && mqttSetupDone && !otaInProgress) {
			unsigned long now = millis();

			// Poll for MQTT broker via SSDP every 3 seconds (until found)
			if (!mqttClient.connected() && (now - lastSsdpPoll >= SSDP_POLL_INTERVAL_MS)) {
				discoverMQTTBroker();
				lastSsdpPoll = now;
			}

			// Process MQTT connection and messages
			mqttLoop();

			// Process pending operations queued from MQTT callback
			// Must happen outside callback context to avoid corrupting MQTT library state
			processPendingMqttOperations();

			// Process queued log messages (ensures all MQTT publishes happen on Core 0)
			processLogQueue();

			// Send periodic telemetry (only after MQTT connected)
			if (mqttClient.connected() && (now - lastTelemetryBroadcast >= TELEMETRY_INTERVAL_MS)) {
				sendDriverTelemetry();
				lastTelemetryBroadcast = now;
			}
		}

		// Always handle OTA when ready
		if (isConnected && otaSetupDone) {
			ArduinoOTA.handle();
		}

		// Skip OLED updates during OTA
		if (hasDisplay && isConnected && !otaInProgress) {
			unsigned long now = millis();
			if (now - lastUptimeUpdate >= UPTIME_UPDATE_INTERVAL) {
				Display::updateUptime(now / 1000);
				lastUptimeUpdate = now;
			}
		}

		// Monitor network task stack usage periodically
		{
			unsigned long now = millis();
			if (now - lastStackCheck >= STACK_CHECK_INTERVAL_MS) {
				UBaseType_t stackRemaining = uxTaskGetStackHighWaterMark(NULL);
				if (stackRemaining < STACK_WARNING_THRESHOLD) {
					log("WARNING: Network task stack low: " + String(stackRemaining) +
					    " bytes remaining", LogLevel::ERROR);
				}
				lastStackCheck = now;
			}
		}

		// Longer delay during OTA to reduce Core 0 load
		vTaskDelay((otaInProgress ? 50 : 10) / portTICK_PERIOD_MS);
	}
}
