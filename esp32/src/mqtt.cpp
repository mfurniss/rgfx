#include "mqtt.h"
#include "matrix.h"
#include "sys_info.h"
#include "log.h"
#include "utils.h"
#include "driver_config.h"
#include "display.h"
#include "udp.h"
#include "config/constants.h"
#include "test.h"
#include "effect-processor.h"
#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// MQTT broker server (discovered via mDNS)
String MQTT_SERVER = "";

// MQTT client
WiFiClient espClient;
MQTTClient mqttClient(MQTT_BUFFER_SIZE);
bool mqttClientInitialized = false;  // Track if client has been initialized

// Connection retry tracking
static int consecutiveFailures = 0;

// Forward declaration for LED access
extern Matrix matrix;

// Toggle state
bool ledsOn = false;

// Test mode state (accessible from main loop)
bool testModeActive = false;

// Forward declarations
void handleDriverConfig(const String& payload);
extern Matrix matrix;
extern UDPMessage pendingMessage;
extern volatile bool newMessageAvailable;
extern EffectProcessor* effectProcessor;

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

	// Handle LED test mode toggle
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/test")) {
		log("LED test mode: " + payload);
		if (payload == "on") {
			// Enable test mode and immediately show test pattern
			testModeActive = true;
			test(matrix, 0);  // Call test effect directly
			FastLED.show();   // Show the test pattern
			log("Test mode ENABLED");
			publishTestState("on");
		} else if (payload == "off") {
			// Disable test mode and clear LEDs
			testModeActive = false;
			fill_solid(matrix.leds, matrix.size, CRGB::Black);
			FastLED.show();

			// Clear any active effects to prevent them from re-rendering
			if (effectProcessor != nullptr) {
				effectProcessor->clearEffects();
			}

			log("Test mode DISABLED");
			publishTestState("off");
		}
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
		return;  // Already connected
	}

	// Check if we've had too many consecutive failures - if so, clear cached IP and rediscover
	// This handles case where broker IP changed or broker went down
	if (consecutiveFailures >= MAX_FAILURES_BEFORE_REDISCOVERY && !MQTT_SERVER.isEmpty()) {
		log("Too many consecutive failures (" + String(consecutiveFailures) +
		    "), clearing cached broker IP and rediscovering...");
		MQTT_SERVER = "";         // Clear cached IP to force rediscovery
		consecutiveFailures = 0;  // Reset counter for rediscovery attempt
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

	// Build status topic for LWT: rgfx/driver/{mac}/status
	String driverId = WiFi.macAddress();
	driverId.replace(":", "-");  // Format MAC as AB-CD-EF-12-34-56
	String statusTopic = "rgfx/driver/" + driverId + "/status";

	// Set Last Will and Testament (LWT) - broker publishes this if connection drops
	// Retained flag ensures Hub receives offline status even if it subscribes late
	mqttClient.setWill(statusTopic.c_str(), "offline", true, 2);

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

		// Subscribe to driver-specific topics
		String driverId = WiFi.macAddress();
		driverId.replace(":", "-");  // Format MAC as AB-CD-EF-12-34-56
		String configTopic = "rgfx/driver/" + driverId + "/config";
		String testTopic = "rgfx/driver/" + driverId + "/test";
		mqttClient.subscribe(configTopic.c_str(), 2);
		mqttClient.subscribe(testTopic.c_str(), 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - rgfx/system/discover");
		log("  - " + configTopic);
		log("  - " + testTopic);

		// Update display to show MQTT connected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(true);
		}

		// Publish "online" status (retained) - overrides LWT offline message
		mqttClient.publish(statusTopic.c_str(), "online", true, 2);
		log("Published status: online to " + statusTopic);

		// Send driver connect message
		sendDriverConnect();

		// Publish current test state immediately to sync with Hub
		// This prevents Hub from pushing stale state and overriding local changes
		publishTestState(testModeActive ? "on" : "off");
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

	// Get system information (including LED config)
	JsonDocument doc = SysInfo::getSysInfo(g_driverConfig, g_configReceived);

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

		// Publish current test state so Hub knows if test mode is active
		publishTestState(testModeActive ? "on" : "off");
	} else {
		log("Failed to send driver connect message");
		log("Payload size: " + String(payload.length()) + " bytes");
		log("Error: " + String(mqttClient.lastError()));
	}
}

// Send simple heartbeat message (periodic keepalive)
void sendDriverHeartbeat() {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	// Create minimal heartbeat payload - just MAC address
	JsonDocument doc;
	doc["mac"] = WiFi.macAddress();

	String payload;
	serializeJson(doc, payload);

	// Publish to rgfx/system/driver/heartbeat with QoS 2
	mqttClient.publish("rgfx/system/driver/heartbeat", payload.c_str(), false, 2);
}

// Publish test state change to Hub
void publishTestState(const String& state) {
	if (!mqttClient.connected()) {
		log("Can't publish test state - MQTT not connected");
		return;
	}

	// Build topic: rgfx/driver/{mac}/test/state
	String driverId = WiFi.macAddress();
	driverId.replace(":", "-");  // Format MAC as AB-CD-EF-12-34-56
	String topic = "rgfx/driver/" + driverId + "/test/state";

	// Publish state with RETAIN flag and QoS 2
	// Retained messages ensure Hub receives state even if it subscribes late
	bool result = mqttClient.publish(topic.c_str(), state.c_str(), true, 2);

	if (result) {
		log("Published test state: " + state + " to " + topic);
	} else {
		log("Failed to publish test state");
	}
}
