#include "mqtt.h"
#include "matrix.h"
#include <FastLED.h>
#include <WiFiUdp.h>

#define UDP_PORT 8888  // Port to listen on for UDP messages

// WiFi credentials
const char* WIFI_SSID = "rme-guest";
const char* WIFI_PASSWORD = "soulmanstax57";

// MQTT broker settings
const char* MQTT_SERVER = "192.168.30.18";
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

	Serial.print("Callback! Delta: ");
	Serial.print(now - lastCallbackTime);
	Serial.println("ms");
	lastCallbackTime = now;

	// TOGGLE: On -> Off, Off -> On
	if (ledsOn) {
		// Turn OFF
		fill_solid(matrix.leds, matrix.size, CRGB::Black);
		ledsOn = false;
		Serial.println("OFF");
	} else {
		// Turn ON (yellow)
		fill_solid(matrix.leds, matrix.size, CRGB::Yellow);
		ledsOn = true;
		Serial.println("ON");
	}
	FastLED.show();
}

// No longer needed
void updateLEDs() {
	// Nothing to do
}

// WiFi connection setup (non-blocking with timeout)
void setupWiFi() {
	Serial.println();
	Serial.print("Connecting to WiFi: ");
	Serial.println(WIFI_SSID);

	WiFi.mode(WIFI_STA);
	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

	// Try to connect for 5 seconds max
	int attempts = 0;
	while (WiFi.status() != WL_CONNECTED && attempts < 10) {
		delay(500);
		Serial.print(".");
		attempts++;
	}

	Serial.println();
	if (WiFi.status() == WL_CONNECTED) {
		Serial.println("WiFi connected!");
		Serial.print("IP address: ");
		Serial.println(WiFi.localIP());

		// AFTER connection, disable power saving for low latency
		WiFi.setSleep(WIFI_PS_NONE);
		WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Max power
		Serial.println("WiFi power saving DISABLED for low latency");
	} else {
		Serial.println("WiFi connection failed - continuing without MQTT");
	}
}

// Setup MQTT client
void setupMQTT() {
	// Only setup MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		mqttClient.setBufferSize(256);  // Set buffer size BEFORE connecting
		mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
		mqttClient.setCallback(mqttCallback);
		reconnectMQTT();
	} else {
		Serial.println("Skipping MQTT setup - no WiFi connection");
	}
}

// Connect/reconnect to MQTT broker (non-blocking, single attempt)
void reconnectMQTT() {
	if (mqttClient.connected()) {
		return; // Already connected
	}

	Serial.print("Attempting MQTT connection...");

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
		Serial.println("connected!");

		// Subscribe without QoS parameter (use default)
		bool subResult = mqttClient.subscribe(MQTT_TOPIC_TEST);

		Serial.print("Subscribe result: ");
		Serial.println(subResult ? "SUCCESS" : "FAILED");
		Serial.println("Subscribed to topic:");
		Serial.print("  - ");
		Serial.println(MQTT_TOPIC_TEST);

		// Turn LEDs dark when MQTT connects
		Serial.println("MQTT connected - LEDs going DARK");
		fill_solid(matrix.leds, matrix.size, CRGB::Black);
		FastLED.show();
	} else {
		Serial.print("failed, rc=");
		Serial.print(mqttClient.state());
		Serial.println(" - will retry in loop");
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
