#include "network/mqtt.h"
#include "network/udp.h"
#include "sys_info.h"
#include "log.h"
#include "utils.h"
#include "driver_config.h"
#include "oled/oled_display.h"
#include "config/constants.h"
#include "effects/effect_processor.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// MQTT broker server (discovered via SSDP)
String MQTT_SERVER = "";

// MQTT client
WiFiClient espClient;
MQTTClient mqttClient(MQTT_BUFFER_SIZE);

// Discovery state tracking
static bool brokerDiscovered = false;

// Test mode state (accessible from main loop)
bool testModeActive = false;

// MQTT message statistics
uint32_t mqttMessagesReceived = 0;

// Forward declarations
void handleDriverConfig(const String& payload);
extern EffectProcessor* effectProcessor;

// MQTT callback function - called when a message is received
void mqttCallback(String& topic, String& payload) {
	mqttMessagesReceived++;  // Increment counter for ALL MQTT messages
	log("MQTT RX: " + topic + " (length: " + String(payload.length()) + " bytes)");

	// Handle driver configuration
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/config")) {
		log("Received driver configuration from Hub");
		handleDriverConfig(payload);
	}

	// Handle LED test mode toggle
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/test")) {
		log("LED test mode: " + payload);
		if (payload == "on") {
			// Enable test mode
			testModeActive = true;
			log("Test mode ENABLED");
			publishTestState("on");
		} else if (payload == "off") {
			// Disable test mode
			testModeActive = false;

			// Clear LEDs when turning off test mode
			if (effectProcessor != nullptr) {
				effectProcessor->clearEffects();
			}

			log("Test mode DISABLED");
			publishTestState("off");
		}
	}

}

// Discover MQTT broker via SSDP (Simple Service Discovery Protocol)
// Single attempt - called periodically from networkTask
bool discoverMQTTBroker() {
	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();

	WiFiUDP udp;
	IPAddress ssdpMulticast(239, 255, 255, 250);
	const uint16_t ssdpPort = 1900;

	// SSDP M-SEARCH query for RGFX MQTT service
	String msearch = "M-SEARCH * HTTP/1.1\r\n"
	                 "HOST: 239.255.255.250:1900\r\n"
	                 "MAN: \"ssdp:discover\"\r\n"
	                 "MX: 3\r\n"
	                 "ST: urn:rgfx:service:mqtt:1\r\n"
	                 "\r\n";

	// Bind UDP socket BEFORE sending to receive responses
	udp.begin(ssdpPort);

	// Send M-SEARCH query
	udp.beginPacket(ssdpMulticast, ssdpPort);
	udp.write((const uint8_t*)msearch.c_str(), msearch.length());
	udp.endPacket();

	// Listen for responses (wait up to 3 seconds)
	unsigned long startTime = millis();
	while (millis() - startTime < 3000) {
		int packetSize = udp.parsePacket();
		if (packetSize > 0) {
			char response[512];
			int len = udp.read(response, sizeof(response) - 1);
			response[len] = '\0';

			String responseStr = String(response);

			// Parse LOCATION header to extract IP and port
			int locIdx = responseStr.indexOf("LOCATION:");
			if (locIdx == -1) {
				locIdx = responseStr.indexOf("Location:");
			}

			if (locIdx != -1) {
				int lineEnd = responseStr.indexOf("\r\n", locIdx);
				String location = responseStr.substring(locIdx + 9, lineEnd);
				location.trim();

				// Extract IP from location (format: http://IP:PORT)
				int ipStart = location.indexOf("//") + 2;
				int ipEnd = location.indexOf(":", ipStart);
				String ipStr = location.substring(ipStart, ipEnd);

				IPAddress brokerIP;
				if (brokerIP.fromString(ipStr)) {
					// Check if on same subnet
					bool sameSubnet = true;
					for (int j = 0; j < 4; j++) {
						if ((ourIP[j] & ourSubnet[j]) != (brokerIP[j] & ourSubnet[j])) {
							sameSubnet = false;
							break;
						}
					}

					if (sameSubnet) {
						MQTT_SERVER = ipStr;
						log("MQTT broker discovered: " + MQTT_SERVER);
						brokerDiscovered = true;

						// Update client with discovered broker address
						mqttClient.setHost(MQTT_SERVER.c_str(), MQTT_PORT);

						udp.stop();
						return true;
					}
				}
			}
		}
		delay(10);
	}
	udp.stop();

	return false;
}

// Setup MQTT client
void setupMQTT() {
	// Only setup MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		// Initialize MQTT client with dummy host (will be updated when broker is discovered)
		mqttClient.begin("0.0.0.0", MQTT_PORT, espClient);
		mqttClient.onMessage(mqttCallback);

		log("MQTT client initialized - will poll for broker every 3 seconds");
	} else {
		log("Skipping MQTT setup - no WiFi connection");
	}
}

// Connect/reconnect to MQTT broker (assumes broker already discovered)
void reconnectMQTT() {
	if (mqttClient.connected()) {
		return;  // Already connected
	}

	if (!brokerDiscovered) {
		return;  // Can't connect without a broker
	}

	log("Connecting to MQTT broker at " + MQTT_SERVER + "...");

	// Create unique client ID based on device ID
	String deviceId = Utils::getDeviceId();
	String clientId = deviceId;

	// Build status topic for LWT: rgfx/driver/{driver-id}/status
	String statusTopic = "rgfx/driver/" + deviceId + "/status";

	// Set Last Will and Testament (LWT) - broker publishes this if connection drops
	mqttClient.setWill(statusTopic.c_str(), "offline", true, 2);

	// Connect to broker
	bool connected;
	if (strlen(MQTT_USER) > 0) {
		connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);
	} else {
		connected = mqttClient.connect(clientId.c_str());
	}

	if (connected) {
		log("MQTT connected!");

		// Seed random number generator with unique values per driver
		IPAddress ip = WiFi.localIP();
		uint16_t seed = (millis() & 0xFFFF) ^ (ip[2] << 8) ^ ip[3];
		random16_set_seed(seed);
		log("Random seed initialized: " + String(seed));

		// Subscribe to topics with QoS 2 (exactly-once delivery)
		mqttClient.subscribe(MQTT_TOPIC_TEST, 2);

		// Subscribe to MAC-based config topic (Hub → Driver commands)
		String macAddress = WiFi.macAddress();
		String macConfigTopic = "rgfx/driver/" + macAddress + "/config";
		mqttClient.subscribe(macConfigTopic.c_str(), 2);

		// Subscribe to ID-based topics (Driver events)
		String testTopic = "rgfx/driver/" + deviceId + "/test";
		mqttClient.subscribe(testTopic.c_str(), 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - " + macConfigTopic + " (config via MAC)");
		log("  - " + testTopic);

		// Update display to show MQTT connected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(true);
		}

		// Publish "online" status (retained) - overrides LWT offline message
		mqttClient.publish(statusTopic.c_str(), "online", true, 2);
		log("Published status: online to " + statusTopic);

		// Send initial driver telemetry
		sendDriverTelemetry();

		// Publish current test state immediately to sync with Hub
		publishTestState(testModeActive ? "on" : "off");
	} else {
		log("MQTT connection failed, rc=" + String(mqttClient.returnCode()));

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

// Send driver telemetry message (initial connection and periodic heartbeat)
void sendDriverTelemetry() {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	// Get full system information (including LED config)
	JsonDocument doc = SysInfo::getSysInfo(g_driverConfig, g_configReceived);

	// Serialize to string
	String payload;
	serializeJson(doc, payload);

	// Check if payload exceeds MQTT buffer size (1024 bytes configured in constructor)
	if (payload.length() > 1024) {
		log("ERROR: Telemetry payload too large for MQTT buffer");
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
		mqttClient.publish("rgfx/system/driver/telemetry", errorPayload.c_str(), false, 2);
		return;
	}

	// Publish to unified telemetry topic with QoS 2 (exactly-once delivery)
	bool result = mqttClient.publish("rgfx/system/driver/telemetry", payload.c_str(), false, 2);

	if (result) {
		log("Driver telemetry sent (QoS 2)");
	} else {
		log("Failed to send driver telemetry");
		log("Payload size: " + String(payload.length()) + " bytes");
		log("Error: " + String(mqttClient.lastError()));
	}
}

// Publish test state change to Hub
void publishTestState(const String& state) {
	if (!mqttClient.connected()) {
		log("Can't publish test state - MQTT not connected");
		return;
	}

	// Build topic: rgfx/driver/{driver-id}/test/state
	String deviceId = Utils::getDeviceId();
	String topic = "rgfx/driver/" + deviceId + "/test/state";

	// Publish state with RETAIN flag and QoS 2
	// Retained messages ensure Hub receives state even if it subscribes late
	bool result = mqttClient.publish(topic.c_str(), state.c_str(), true, 2);

	if (result) {
		log("Published test state: " + state + " to " + topic);
	} else {
		log("Failed to publish test state");
	}
}
