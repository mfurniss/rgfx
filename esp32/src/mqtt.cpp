#include "mqtt.h"
#include "matrix.h"
#include "sys_info.h"
#include "log.h"
#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoJson.h>

// MQTT broker settings
const char* MQTT_SERVER = "192.168.10.23";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "ESP32_LED_Matrix";
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
	static unsigned long lastCallbackTime = 0;
	unsigned long now = millis();

	log("Callback! Delta: " + String(now - lastCallbackTime) + "ms");
	lastCallbackTime = now;

	// // TOGGLE: On -> Off, Off -> On
	// if (ledsOn) {
	//  // Turn OFF
	//  fill_solid(matrix.leds, matrix.size, CRGB::Black);
	//  ledsOn = false;
	//  Serial.println("OFF");
	// } else {
	//  // Turn ON (yellow)
	//  fill_solid(matrix.leds, matrix.size, CRGB::Yellow);
	//  ledsOn = true;
	//  Serial.println("ON");
	// }
	// FastLED.show();
}


// Setup MQTT client
void setupMQTT() {
	// Only setup MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		mqttClient.setBufferSize(512);  // Set buffer size BEFORE connecting
		mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
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

	// Create unique client ID to avoid conflicts
	String clientId = String(MQTT_CLIENT_ID) + "_" + String(random(0xffff), HEX);

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

	// Publish to rgfx/system/driver/connect
	bool result = mqttClient.publish("rgfx/system/driver/connect", payload.c_str());

	if (result) {
		log("Driver connect message sent");
		log(payload);
	} else {
		log("Failed to send driver connect message");
	}
}

