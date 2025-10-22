#include "mqtt.h"
#include "matrix.h"
#include "sys_info.h"
#include "log.h"
#include "utils.h"
#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// MQTT broker settings
const int MQTT_PORT = 1883;
String MQTT_SERVER = "";  // Will be discovered via mDNS
const char* MQTT_USER = "";  // Leave empty if no authentication
const char* MQTT_PASSWORD = "";  // Leave empty if no authentication

// MQTT topics
const char* MQTT_TOPIC_TEST = "rgfx/test";
const char* MQTT_TOPIC_STATUS = "led/status";

// MQTT client
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Forward declaration for LED access
extern Matrix matrix;

// Toggle state
bool ledsOn = false;


// MQTT callback function - called when a message is received
void mqttCallback(char* topic, byte* payload, unsigned int length) {
	// Message handling will be implemented here
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
		// Discover broker via mDNS
		if (!discoverMQTTBroker()) {
			log("ERROR: No MQTT broker found via mDNS. Make sure rgfx-hub is running.");
			return;
		}

		mqttClient.setBufferSize(1024);  // Set buffer size BEFORE connecting (large enough for system info JSON)
		mqttClient.setServer(MQTT_SERVER.c_str(), MQTT_PORT);
		mqttClient.setCallback(mqttCallback);
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

	log("Attempting MQTT connection...");

	// Create unique client ID based on MAC address (stable across reboots)
	String clientId = Utils::getDeviceName();

	// Simple connection - no LWT, just connect
	bool connected;
	if (strlen(MQTT_USER) > 0) {
		connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);
	} else {
		connected = mqttClient.connect(clientId.c_str());
	}

	if (connected) {
		log("connected!");

		// Subscribe without QoS parameter (use default)
		bool subResult = mqttClient.subscribe(MQTT_TOPIC_TEST);

		log("Subscribe result: " + String(subResult ? "SUCCESS" : "FAILED"));
		log("Subscribed to topic:");
		log("  - " + String(MQTT_TOPIC_TEST));

		// Turn LEDs dark when MQTT connects
		log("MQTT connected - LEDs going DARK");
		fill_solid(matrix.leds, matrix.size, CRGB::Black);
		FastLED.show();

		// Send driver connect message
		sendDriverConnect();
	} else {
		log("failed, rc=" + String(mqttClient.state()) + " - will retry in loop");
	}
}

// Maintain MQTT connection (call from main loop)
void mqttLoop() {
	// Only run MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		if (!mqttClient.connected()) {
			// Only retry every 5 seconds to avoid spam
			static unsigned long lastAttempt = 0;
			if (millis() - lastAttempt > 5000) {
				reconnectMQTT();
				lastAttempt = millis();
			}
		} else {
			mqttClient.loop();
		}
	}
}

// Send driver connect message with device info
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

	// Check if payload exceeds MQTT buffer size
	if (payload.length() > mqttClient.getBufferSize()) {
		log("ERROR: System info payload too large for MQTT buffer");
		log("Payload size: " + String(payload.length()) + " bytes");
		log("Buffer size: " + String(mqttClient.getBufferSize()) + " bytes");

		// Send error message instead
		JsonDocument errorDoc;
		errorDoc["error"] = "Payload too large for MQTT buffer";
		errorDoc["payloadSize"] = payload.length();
		errorDoc["bufferSize"] = mqttClient.getBufferSize();
		errorDoc["mac"] = WiFi.macAddress();
		errorDoc["ip"] = WiFi.localIP().toString();

		String errorPayload;
		serializeJson(errorDoc, errorPayload);
		mqttClient.publish("rgfx/system/driver/connect", errorPayload.c_str());
		return;
	}

	// Publish to rgfx/system/driver/connect
	bool result = mqttClient.publish("rgfx/system/driver/connect", payload.c_str());

	if (result) {
		log("Driver connect message sent");
		log(payload);
	} else {
		log("Failed to send driver connect message");
		log("Payload size: " + String(payload.length()) + " bytes");
	}
}

