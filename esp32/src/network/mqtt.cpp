#include "network/mqtt.h"
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

// Connection retry tracking
static int consecutiveFailures = 0;

// Test mode state (accessible from main loop)
bool testModeActive = false;

// Forward declarations
void handleDriverConfig(const String& payload);
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
bool discoverMQTTBroker() {
	log("Discovering MQTT broker via SSDP...");

	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();
	log("ESP32 IP: " + ourIP.toString() + ", Subnet: " + ourSubnet.toString());

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

	// Retry loop: allow time for network propagation
	for (int attempt = 0; attempt < 3; attempt++) {
		if (attempt > 0) {
			log("Retry attempt " + String(attempt + 1) + "/3");
			delay(250);
		}

		// Bind UDP socket BEFORE sending to receive responses
		udp.begin(ssdpPort);

		// Send M-SEARCH query
		udp.beginPacket(ssdpMulticast, ssdpPort);
		udp.write((const uint8_t*)msearch.c_str(), msearch.length());
		udp.endPacket();

		log("Sent SSDP M-SEARCH query");

		// Listen for responses (wait up to 3 seconds)
		unsigned long startTime = millis();
		while (millis() - startTime < 3000) {
			int packetSize = udp.parsePacket();
			if (packetSize > 0) {
				char response[512];
				int len = udp.read(response, sizeof(response) - 1);
				response[len] = '\0';

				String responseStr = String(response);
				log("SSDP response received (" + String(len) + " bytes)");

				// Parse LOCATION header to extract IP and port
				int locIdx = responseStr.indexOf("LOCATION:");
				if (locIdx == -1) {
					locIdx = responseStr.indexOf("Location:");
				}

				if (locIdx != -1) {
					int lineEnd = responseStr.indexOf("\r\n", locIdx);
					String location = responseStr.substring(locIdx + 9, lineEnd);
					location.trim();

					log("  Location: " + location);

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
								log("    Rejected (different subnet)");
								break;
							}
						}

						if (sameSubnet) {
							MQTT_SERVER = ipStr;
							log("  ✓ Selected broker: " + MQTT_SERVER);
							udp.stop();
							return true;
						}
					}
				}
			}
			delay(10);
		}
		udp.stop();
	}

	log("No MQTT broker found via SSDP after 3 attempts");
	return false;
}

// Setup MQTT client
void setupMQTT() {
	// Only setup MQTT if WiFi is connected
	if (WiFi.status() == WL_CONNECTED) {
		// Initialize MQTT client with dummy host (will be updated when broker is discovered)
		mqttClient.begin("0.0.0.0", MQTT_PORT, espClient);
		mqttClient.onMessage(mqttCallback);

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

	// Create unique client ID based on device ID
	String deviceId = Utils::getDeviceId();
	String clientId = deviceId;

	// Build status topic for LWT: rgfx/driver/{driver-id}/status
	String statusTopic = "rgfx/driver/" + deviceId + "/status";

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

		// Subscribe to MAC-based config topic (Hub → Driver commands)
		String macAddress = WiFi.macAddress();  // AA:BB:CC:DD:EE:FF (with colons)
		String macConfigTopic = "rgfx/driver/" + macAddress + "/config";
		mqttClient.subscribe(macConfigTopic.c_str(), 2);

		// Subscribe to ID-based topics (Driver events)
		String testTopic = "rgfx/driver/" + deviceId + "/test";
		mqttClient.subscribe(testTopic.c_str(), 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - rgfx/system/discover");
		log("  - " + macConfigTopic + " (config via MAC)");
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
