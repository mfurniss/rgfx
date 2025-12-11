#include "network/mqtt.h"
#include "network/udp.h"
#include "telemetry.h"
#include "log.h"
#include "utils.h"
#include "driver_config.h"
#include "oled/oled_display.h"
#include "config/constants.h"
#include "config/config_nvs.h"
#include "effects/effect_processor.h"
#include "serial_commands/commands.h"
#include "crash_handler.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// MQTT broker server (discovered via SSDP)
String MQTT_SERVER = "";

// MQTT client - read buffer for incoming config, write buffer only needs header/topic (payloads stream)
WiFiClient espClient;
MQTTClient mqttClient(2048, 256);

// Discovery state tracking
static bool brokerDiscovered = false;

// MQTT reconnection failure tracking
static uint8_t mqttConsecutiveFailures = 0;
static const uint8_t MQTT_MAX_FAILURES = 10;

// Test mode state (atomic for cross-core access - written by Core 0, read by Core 1)
std::atomic<bool> testModeActive(false);

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

	// Handle reset command
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/reset")) {
		log("Reset command received - initiating reset...");
		Commands::reset("");
	}

	// Handle reboot command
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/reboot")) {
		log("Reboot command received - initiating reboot...");
		Commands::reboot("");
	}

	// Handle logging configuration
	if (topic.startsWith("rgfx/driver/") && topic.endsWith("/logging")) {
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

}

// Discover MQTT broker via UDP broadcast
// Listens for discovery announcements from Hub - single attempt called periodically from networkTask
bool discoverMQTTBroker() {
	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();

	WiFiUDP udp;
	const uint16_t discoveryPort = 8889;

	// Bind to discovery port to receive broadcasts
	if (!udp.begin(discoveryPort)) {
		log("Failed to bind UDP discovery port " + String(discoveryPort));
		return false;
	}

	log("Listening for broker discovery broadcasts on port " + String(discoveryPort) + "...");

	// Listen for broadcasts (Hub sends every 5 seconds, so wait 6 seconds minimum)
	unsigned long startTime = millis();
	uint16_t packetsReceived = 0;
	while (millis() - startTime < 6000) {
		int packetSize = udp.parsePacket();
		if (packetSize > 0) {
			packetsReceived++;
			log("Received discovery packet #" + String(packetsReceived) + " (" + String(packetSize) + " bytes) from " + udp.remoteIP().toString());

			char packet[512];
			int len = udp.read(packet, sizeof(packet) - 1);
			if (len <= 0 || len >= (int)sizeof(packet)) {
				log("Invalid packet length: " + String(len));
				continue;
			}
			packet[len] = '\0';

			// Parse JSON message: {"service":"rgfx-mqtt-broker","ip":"192.168.10.23","port":1883}
			JsonDocument doc;
			DeserializationError error = deserializeJson(doc, packet);

			if (error) {
				log("Failed to parse discovery message: " + String(error.c_str()));
				continue;
			}

			// Check if this is an RGFX MQTT broker announcement
			const char* service = doc["service"];
			if (service && String(service) == "rgfx-mqtt-broker") {
				const char* ipStr = doc["ip"];
				int port = doc["port"] | 0;

				if (ipStr && port > 0) {
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
							MQTT_SERVER = String(ipStr);
							log("MQTT broker discovered via UDP broadcast: " + MQTT_SERVER + ":" + String(port));
							brokerDiscovered = true;

							// Update client with discovered broker address
							mqttClient.setHost(MQTT_SERVER.c_str(), port);

							udp.stop();
							return true;
						} else {
							log("Broker on different subnet - ignoring");
						}
					}
				}
			}
		}
		delay(10);
	}

	log("No broker discovery broadcasts received within timeout");
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

	// Ensure old TCP connection is properly closed before reconnecting
	// This prevents socket leaks and CLOSE_WAIT state accumulation
	espClient.stop();

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
		mqttConsecutiveFailures = 0;  // Reset failure counter on successful connection

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

		String resetTopic = "rgfx/driver/" + deviceId + "/reset";
		mqttClient.subscribe(resetTopic.c_str(), 2);

		String rebootTopic = "rgfx/driver/" + deviceId + "/reboot";
		mqttClient.subscribe(rebootTopic.c_str(), 2);

		// Subscribe to logging config topic (uses MAC address)
		String loggingTopic = "rgfx/driver/" + macAddress + "/logging";
		mqttClient.subscribe(loggingTopic.c_str(), 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - " + macConfigTopic + " (config via MAC)");
		log("  - " + loggingTopic + " (logging config via MAC)");
		log("  - " + testTopic);
		log("  - " + resetTopic);
		log("  - " + rebootTopic);

		// Load saved remote logging level from NVS
		String savedLoggingLevel = ConfigNVS::loadLoggingLevel();
		setRemoteLoggingLevel(savedLoggingLevel);
		log("Remote logging level loaded from NVS: " + savedLoggingLevel);

		// Update display to show MQTT connected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(true);
		}

		// Publish "online" status (retained) - overrides LWT offline message
		mqttClient.publish(statusTopic.c_str(), "online", true, 2);
		log("Published status: online to " + statusTopic);

		// FIRST: Send crash report if we recovered from a crash
		// This must happen before anything else to ensure crash data reaches Hub
		// even if we crash again shortly after (e.g., when processing LED config)
		publishCrashReport();

		// Send initial driver telemetry
		sendDriverTelemetry();

		// Publish current test state immediately to sync with Hub
		publishTestState(testModeActive ? "on" : "off");
	} else {
		mqttConsecutiveFailures++;
		log("MQTT connection failed, rc=" + String(mqttClient.returnCode()) +
		    " (attempt " + String(mqttConsecutiveFailures) + "/" + String(MQTT_MAX_FAILURES) + ")");

		// Reset broker discovery after too many consecutive failures
		if (mqttConsecutiveFailures >= MQTT_MAX_FAILURES) {
			log("MQTT reconnection failed " + String(MQTT_MAX_FAILURES) +
			    " times - resetting broker discovery", LogLevel::ERROR);
			brokerDiscovered = false;
			MQTT_SERVER = "";
			mqttConsecutiveFailures = 0;
		}

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

	// Get full system telemetry (including LED config)
	JsonDocument doc = Telemetry::getTelemetry(g_driverConfig, g_configReceived);

	// Serialize to string
	String payload;
	serializeJson(doc, payload);

	// Publish to unified telemetry topic with QoS 2 (exactly-once delivery)
	// Note: Write buffer only needs header/topic space - payloads are streamed directly (v2.5.2+)
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
