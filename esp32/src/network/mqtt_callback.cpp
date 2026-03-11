#include "network/mqtt.h"
#include "network/mqtt_ota.h"
#include "network/network_init.h"
#include "log.h"
#include "utils.h"
#include "safe_restart.h"
#include "driver_config.h"
#include "config/config_nvs.h"
#include "config/config_portal.h"
#include "effects/effect_processor.h"
#include "serial_commands/commands.h"
#include <ArduinoJson.h>

// Forward declarations
void handleDriverConfig(const String& payload);
extern EffectProcessor* effectProcessor;
extern std::atomic<bool> mqttEventReceived;

// Pending operations for deferred processing (set in callback, processed in loop)
// The arduino-mqtt library is not reentrant - heavy operations in callbacks corrupt state
static String pendingConfig;
static bool hasPendingConfig = false;
static bool pendingTestModeChange = false;
static bool pendingTestModeValue = false;
static bool pendingLoggingConfig = false;
static String pendingLoggingPayload;
static bool pendingWifiConfig = false;
static String pendingWifiSsid;
static String pendingWifiPassword;
static bool hasPendingOta = false;
static String pendingOtaPayload;

// MQTT callback function - called when a message is received
// IMPORTANT: Keep this lightweight! The arduino-mqtt library is not reentrant.
// Heavy operations or MQTT calls (publish/subscribe/unsubscribe) inside callbacks
// corrupt the library's internal state, causing Error -9 on subsequent operations.
// Queue work here, process it in processPendingMqttOperations().
void mqttCallback(String& topic, String& payload) {
	mqttMessagesReceived++;  // Increment counter for ALL MQTT messages
	mqttEventReceived = true;  // Signal Core 1 to flash indicator
	log("MQTT RX: " + topic + " (length: " + String(payload.length()) + " bytes)");

	// Handle driver configuration - queue for deferred processing
	// Config handling does JSON parsing, NVS writes, FastLED init, and MQTT subscribe/unsubscribe
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/config")) {
		log("Queuing driver configuration for processing");
		pendingConfig = payload;
		hasPendingConfig = true;
	}

	// Handle LED test mode toggle - queue state change for deferred processing
	// Test mode changes call publishTestState() which must not happen inside callback
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/test")) {
		log("Queuing test mode change: " + payload);
		if (payload == "on") {
			pendingTestModeChange = true;
			pendingTestModeValue = true;
		} else if (payload == "off") {
			pendingTestModeChange = true;
			pendingTestModeValue = false;
		}
	}

	// Handle reset command - safe to execute directly (no MQTT operations)
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/reset")) {
		log("Reset command received - initiating reset...");
		Commands::reset("");
	}

	// Handle reboot command - safe to execute directly (no MQTT operations)
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/reboot")) {
		log("Reboot command received - initiating reboot...");
		Commands::reboot("");
	}

	// Handle clear-effects command - defer to Core 1 to avoid cross-core FastLED.show() race
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/clear-effects")) {
		log("Clear effects command received");
		pendingClearEffects.store(true);
	}

	// Handle logging configuration - queue for deferred processing
	// Logging config does NVS writes which can be slow
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/logging")) {
		log("Queuing logging configuration for processing");
		pendingLoggingConfig = true;
		pendingLoggingPayload = payload;
	}

	// Handle MQTT OTA request - queue for deferred processing
	// OTA does HTTP download, Update.write, and MQTT publish (all heavy operations)
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/ota")) {
		log("Queuing MQTT OTA request for processing");
		pendingOtaPayload = payload;
		hasPendingOta = true;
	}

	// Handle WiFi configuration - queue for deferred processing
	// WiFi config does NVS writes and triggers reboot
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/wifi")) {
		log("Queuing WiFi configuration for processing");
		JsonDocument doc;
		DeserializationError error = deserializeJson(doc, payload);

		if (error) {
			log("ERROR: Failed to parse WiFi config JSON: " + String(error.c_str()));
			return;
		}

		if (!doc["ssid"].is<const char*>()) {
			log("ERROR: WiFi config missing 'ssid' field");
			return;
		}

		pendingWifiSsid = doc["ssid"].as<String>();
		pendingWifiPassword = doc["password"].as<String>();
		pendingWifiConfig = true;
	}
}

// Process pending MQTT operations queued from callback
// Call this from the network task loop AFTER mqttLoop()
// This ensures heavy operations and MQTT calls happen outside the callback context
void processPendingMqttOperations() {
	// Process pending driver configuration
	if (hasPendingConfig) {
		hasPendingConfig = false;
		String config = pendingConfig;
		pendingConfig = "";  // Free memory immediately
		log("Processing deferred driver configuration");
		handleDriverConfig(config);
	}

	// Process pending test mode change
	if (pendingTestModeChange) {
		pendingTestModeChange = false;
		bool newState = pendingTestModeValue;

		if (newState) {
			testModeActive = true;
			log("Test mode ENABLED");
			publishTestState("on");
		} else {
			testModeActive = false;

			// Defer LED clear to Core 1 to avoid cross-core FastLED.show() race
			pendingClearEffects.store(true);

			log("Test mode DISABLED");
			publishTestState("off");
		}
	}

	// Process pending logging configuration
	if (pendingLoggingConfig) {
		pendingLoggingConfig = false;
		String payload = pendingLoggingPayload;
		pendingLoggingPayload = "";  // Free memory immediately

		JsonDocument doc;
		DeserializationError error = deserializeJson(doc, payload);

		if (error) {
			log("Failed to parse logging config: " + String(error.c_str()), LogLevel::ERROR);
			return;
		}

		const char* level = doc["level"];
		if (level) {
			String levelStr = String(level);
			setRemoteLoggingLevel(levelStr);
			ConfigNVS::saveLoggingLevel(levelStr);
			log("Remote logging level set to: " + levelStr);
		}
	}

	// Process pending MQTT OTA request
	if (hasPendingOta) {
		hasPendingOta = false;
		String payload = pendingOtaPayload;
		pendingOtaPayload = "";  // Free memory immediately
		log("Processing deferred MQTT OTA request");
		handleMqttOta(payload);
	}

	// Process pending WiFi configuration
	if (pendingWifiConfig) {
		pendingWifiConfig = false;
		String ssid = pendingWifiSsid;
		String password = pendingWifiPassword;
		pendingWifiSsid = "";
		pendingWifiPassword = "";

		log("Setting WiFi credentials via MQTT...");

		if (ConfigPortal::setWiFiCredentials(ssid, password)) {
			log("WiFi credentials saved!");

			// Publish confirmation before rebooting
			String deviceId = Utils::getDeviceId();
			String responseTopic = "rgfx/driver/" + deviceId + "/wifi/response";
			mqttClient.publish(responseTopic.c_str(), R"({"success":true})", false, 2);
			mqttClient.loop();  // Ensure message is sent
			delay(MQTT_PUBLISH_BEFORE_REBOOT_DELAY_MS);

			safeRestart();
		} else {
			log("ERROR: Failed to set WiFi credentials", LogLevel::ERROR);

			// Publish failure response
			String deviceId = Utils::getDeviceId();
			String responseTopic = "rgfx/driver/" + deviceId + "/wifi/response";
			mqttClient.publish(responseTopic.c_str(), R"({"success":false,"error":"Failed to save credentials"})", false, 2);
		}
	}
}
