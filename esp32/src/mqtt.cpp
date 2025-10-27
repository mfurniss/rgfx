#include "mqtt.h"
#include "matrix.h"
#include "sys_info.h"
#include "log.h"
#include "utils.h"
#include "driver_config.h"
#include "display.h"
#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// MQTT broker settings
const int MQTT_PORT = 1883;
String MQTT_SERVER = "";        // Will be discovered via mDNS
const char* MQTT_USER = "";     // Leave empty if no authentication
const char* MQTT_PASSWORD = ""; // Leave empty if no authentication

// MQTT topics
const char* MQTT_TOPIC_TEST = "rgfx/test";
const char* MQTT_TOPIC_STATUS = "led/status";

// MQTT client configuration
static constexpr uint16_t MQTT_BUFFER_SIZE = 1024;           // Buffer size for large JSON payloads
static constexpr uint16_t MQTT_RECONNECT_INTERVAL_MS = 5000; // Retry connection every 5 seconds

// MQTT client
WiFiClient espClient;
MQTTClient mqttClient(MQTT_BUFFER_SIZE);
bool mqttClientInitialized = false; // Track if client has been initialized

// Connection retry tracking
static int consecutiveFailures = 0;
const int MAX_FAILURES_BEFORE_REDISCOVERY = 3; // Rediscover after 3 failed attempts (15 seconds)

// Forward declaration for LED access
extern Matrix matrix;

// Toggle state
bool ledsOn = false;

// Forward declaration for config handling
void handleDriverConfig(const String& payload);

// MQTT callback function - called when a message is received
void mqttCallback(String& topic, String& payload) {
	log("MQTT RX: " + topic + " (length: " + String(payload.length()) + " bytes)");

	// Respond to discovery requests from Hub with heartbeat
	if (topic == "rgfx/system/discover") {
		log("Received discovery request - sending heartbeat");
		sendDriverHeartbeat();
	}

	// Handle driver configuration
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/config")) {
		log("Received driver configuration from Hub");
		handleDriverConfig(payload);
	}
}

// Discover MQTT broker via mDNS
bool discoverMQTTBroker() {
	log("Discovering MQTT broker via mDNS...");

	int n = MDNS.queryService("mqtt", "tcp");
	if (n == 0) {
		log("No MQTT brokers found via mDNS");
		return false;
	}

	log("Found " + String(n) + " MQTT broker(s)");

	// Use the first broker found
	MQTT_SERVER = MDNS.IP(0).toString();
	log("Discovered broker: " + MQTT_SERVER + ":" + String(MQTT_PORT));
	log("Service name: " + String(MDNS.hostname(0)));

	return true;
}

// Setup MQTT client
void setupMQTT() {
	// Only setup MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		// Initialize MQTT client with dummy host (will be updated when broker is discovered)
		mqttClient.begin("0.0.0.0", MQTT_PORT, espClient);
		mqttClient.onMessage(mqttCallback);
		mqttClientInitialized = true;

		log("MQTT client initialized - will discover broker in background");

		// Try initial connection (will retry in mqttLoop if it fails)
		reconnectMQTT();
	} else {
		log("Skipping MQTT setup - no WiFi connection");
	}
}

// Connect/reconnect to MQTT broker (non-blocking, single attempt)
void reconnectMQTT() {
	if (mqttClient.connected()) {
		return; // Already connected
	}

	// Check if we've had too many consecutive failures - if so, clear cached IP and rediscover
	// This handles case where broker IP changed or broker went down
	if (consecutiveFailures >= MAX_FAILURES_BEFORE_REDISCOVERY && !MQTT_SERVER.isEmpty()) {
		log("Too many consecutive failures (" + String(consecutiveFailures) +
		    "), clearing cached broker IP and rediscovering...");
		MQTT_SERVER = "";        // Clear cached IP to force rediscovery
		consecutiveFailures = 0; // Reset counter for rediscovery attempt
	}

	// Discover broker via mDNS if we don't have one or it's invalid
	// This continuously retries discovery until a broker is found
	if (MQTT_SERVER.isEmpty() || MQTT_SERVER == "0.0.0.0") {
		if (!discoverMQTTBroker()) {
			// Discovery failed - broker not available yet
			// Don't increment consecutive failures since we haven't tried connecting yet
			// This allows continuous discovery attempts without triggering rediscovery logic
			return;
		}

		// Update client with discovered broker address
		mqttClient.setHost(MQTT_SERVER.c_str(), MQTT_PORT);
		log("MQTT broker discovered and configured");
	}

	log("Attempting MQTT connection to " + MQTT_SERVER + "...");

	// Create unique client ID based on MAC address (stable across reboots)
	String clientId = Utils::getDeviceName();

	// Connect to broker
	bool connected;
	if (strlen(MQTT_USER) > 0) {
		connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);
	} else {
		connected = mqttClient.connect(clientId.c_str());
	}

	if (connected) {
		log("connected!");

		// Reset failure counter on successful connection
		consecutiveFailures = 0;

		// Subscribe to topics with QoS 2 (exactly-once delivery)
		mqttClient.subscribe(MQTT_TOPIC_TEST, 2);
		mqttClient.subscribe("rgfx/system/discover", 2);

		// Subscribe to driver-specific config topic
		String driverId = WiFi.macAddress();
		driverId.replace(":", "-"); // Format MAC as AB-CD-EF-12-34-56
		String configTopic = "rgfx/driver/" + driverId + "/config";
		mqttClient.subscribe(configTopic.c_str(), 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - rgfx/system/discover");
		log("  - " + configTopic);

		// Update display to show MQTT connected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(true);
		}

		// Turn LEDs dark when MQTT connects
		log("MQTT connected - LEDs going DARK");
		fill_solid(matrix.leds, matrix.size, CRGB::Black);
		FastLED.show();

		// Send driver connect message
		sendDriverConnect();
	} else {
		log("failed, rc=" + String(mqttClient.returnCode()) + " - will retry in loop");
		consecutiveFailures++;
		log("Consecutive failures: " + String(consecutiveFailures) + "/" +
		    String(MAX_FAILURES_BEFORE_REDISCOVERY));

		// Update display to show MQTT disconnected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(false);
		}
	}
}

// Maintain MQTT connection (call from main loop)
void mqttLoop() {
	// Only run MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		if (!mqttClient.connected()) {
			// Only retry every 5 seconds to avoid spam
			static unsigned long lastAttempt = 0;
			unsigned long now = millis();

			if (now - lastAttempt > MQTT_RECONNECT_INTERVAL_MS) {
				reconnectMQTT();
				lastAttempt = now;
			}
		} else {
			mqttClient.loop();
		}
	}
}

// Send driver connect message with full system info (initial connection only)
void sendDriverConnect() {
	if (!mqttClient.connected()) {
		log("Can't send driver connect - MQTT not connected");
		return;
	}

	// Get system information
	JsonDocument doc = SysInfo::getSysInfo(matrix);

	// Serialize to string
	String payload;
	serializeJson(doc, payload);

	// Check if payload exceeds MQTT buffer size (1024 bytes configured in constructor)
	if (payload.length() > 1024) {
		log("ERROR: System info payload too large for MQTT buffer");
		log("Payload size: " + String(payload.length()) + " bytes");
		log("Buffer size: 1024 bytes");

		// Send error message instead with QoS 2
		JsonDocument errorDoc;
		errorDoc["error"] = "Payload too large for MQTT buffer";
		errorDoc["payloadSize"] = payload.length();
		errorDoc["bufferSize"] = 1024;
		errorDoc["mac"] = WiFi.macAddress();
		errorDoc["ip"] = WiFi.localIP().toString();

		String errorPayload;
		serializeJson(errorDoc, errorPayload);
		mqttClient.publish("rgfx/system/driver/connect", errorPayload.c_str(), false, 2);
		return;
	}

	// Publish to rgfx/system/driver/connect with QoS 2 (exactly-once delivery)
	bool result = mqttClient.publish("rgfx/system/driver/connect", payload.c_str(), false, 2);

	if (result) {
		log("Driver connect message sent (QoS 2)");
		log(payload);
	} else {
		log("Failed to send driver connect message");
		log("Payload size: " + String(payload.length()) + " bytes");
		log("Error: " + String(mqttClient.lastError()));
	}
}

// Send simple heartbeat message (periodic keepalive)
void sendDriverHeartbeat() {
	if (!mqttClient.connected()) {
		return; // Silently skip if not connected
	}

	// Create minimal heartbeat payload - just MAC address
	JsonDocument doc;
	doc["mac"] = WiFi.macAddress();

	String payload;
	serializeJson(doc, payload);

	// Publish to rgfx/system/driver/heartbeat with QoS 2
	mqttClient.publish("rgfx/system/driver/heartbeat", payload.c_str(), false, 2);
}
