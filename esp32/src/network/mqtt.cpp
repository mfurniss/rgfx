#include "network/mqtt.h"
#include "network/udp.h"
#include "telemetry.h"
#include "log.h"
#include "safe_restart.h"
#include "utils.h"
#include "driver_config.h"
#include "oled/oled_display.h"
#include "config/constants.h"
#include "config/config_nvs.h"
#include "config/config_portal.h"
#include "effects/effect_processor.h"
#include "network/network_init.h"
#include "serial_commands/commands.h"
#include "crash_handler.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// MQTT broker server IP (discovered via SSDP broadcast)
// Fixed-size char array avoids heap fragmentation from String operations
char mqttServerIP[16] = {0};
bool mqttServerDiscovered = false;

// MQTT client - read buffer for incoming config, write buffer only needs header/topic (payloads stream)
WiFiClient espClient;
MQTTClient mqttClient(2048, 256);

// MQTT reconnection failure tracking
static uint8_t mqttConsecutiveFailures = 0;
static const uint8_t MQTT_MAX_FAILURES = 10;

// Test mode state (atomic for cross-core access - written by Core 0, read by Core 1)
std::atomic<bool> testModeActive(false);

// MQTT message statistics
uint32_t mqttMessagesReceived = 0;

// Pre-allocated topic buffers (initialized once in initMQTTTopics)
// Avoids heap fragmentation from repeated String allocations in reconnectMQTT()
// All topics use MAC address as the immutable hardware identifier
static const size_t TOPIC_BUFFER_SIZE = 64;
static char topicStatus[TOPIC_BUFFER_SIZE];       // rgfx/driver/{mac}/status
static char topicConfig[TOPIC_BUFFER_SIZE];       // rgfx/driver/{mac}/config
static char topicTest[TOPIC_BUFFER_SIZE];         // rgfx/driver/{mac}/test
static char topicReset[TOPIC_BUFFER_SIZE];        // rgfx/driver/{mac}/reset
static char topicReboot[TOPIC_BUFFER_SIZE];       // rgfx/driver/{mac}/reboot
static char topicLogging[TOPIC_BUFFER_SIZE];      // rgfx/driver/{mac}/logging
static char topicClearEffects[TOPIC_BUFFER_SIZE]; // rgfx/driver/{mac}/clear-effects
static char topicWifi[TOPIC_BUFFER_SIZE];         // rgfx/driver/{mac}/wifi
static char clientId[32];                         // Device ID as client ID
static bool topicsInitialized = false;

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

// Initialize MQTT topic strings using MAC address (immutable hardware identifier)
static void initMQTTTopics() {
	if (topicsInitialized) return;

	String deviceId = Utils::getDeviceId();
	String macAddress = WiFi.macAddress();

	// All topics use MAC address - no resubscription needed when driver ID changes
	snprintf(topicStatus, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/status", macAddress.c_str());
	snprintf(topicConfig, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/config", macAddress.c_str());
	snprintf(topicTest, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/test", macAddress.c_str());
	snprintf(topicReset, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/reset", macAddress.c_str());
	snprintf(topicReboot, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/reboot", macAddress.c_str());
	snprintf(topicLogging, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/logging", macAddress.c_str());
	snprintf(topicClearEffects, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/clear-effects", macAddress.c_str());
	snprintf(topicWifi, TOPIC_BUFFER_SIZE, "rgfx/driver/%s/wifi", macAddress.c_str());
	strncpy(clientId, deviceId.c_str(), sizeof(clientId) - 1);
	clientId[sizeof(clientId) - 1] = '\0';

	topicsInitialized = true;
	log("MQTT topics initialized for MAC: " + macAddress);
}

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

	// Handle clear-effects command - safe to execute directly (no MQTT operations)
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/clear-effects")) {
		log("Clear effects command received");
		if (effectProcessor != nullptr) {
			effectProcessor->clearEffects();
		}
	}

	// Handle logging configuration - queue for deferred processing
	// Logging config does NVS writes which can be slow
	else if (topic.startsWith("rgfx/driver/") && topic.endsWith("/logging")) {
		log("Queuing logging configuration for processing");
		pendingLoggingConfig = true;
		pendingLoggingPayload = payload;
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
							strncpy(mqttServerIP, ipStr, sizeof(mqttServerIP) - 1);
							mqttServerIP[sizeof(mqttServerIP) - 1] = '\0';
							log("MQTT broker discovered via UDP broadcast: " + String(mqttServerIP) + ":" + String(port));
							mqttServerDiscovered = true;

							// Update client with discovered broker address
							mqttClient.setHost(mqttServerIP, port);

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
		mqttClient.setKeepAlive(MQTT_KEEPALIVE_SECONDS);

		log("MQTT client initialized (keepalive=" + String(MQTT_KEEPALIVE_SECONDS) +
		    "s) - will poll for broker every 3 seconds");
	} else {
		log("Skipping MQTT setup - no WiFi connection");
	}
}

// Connect/reconnect to MQTT broker (assumes broker already discovered)
void reconnectMQTT() {
	if (mqttClient.connected()) {
		return;  // Already connected
	}

	if (!mqttServerDiscovered) {
		return;  // Can't connect without a broker
	}

	// Initialize topic buffers on first connection attempt
	initMQTTTopics();

	// Ensure old TCP connection is properly closed before reconnecting
	// This prevents socket leaks and CLOSE_WAIT state accumulation
	espClient.stop();

	log("Connecting to MQTT broker at " + String(mqttServerIP) + "...");

	// Set Last Will and Testament (LWT) - broker publishes this if connection drops
	mqttClient.setWill(topicStatus, "offline", true, 2);

	// Connect to broker using pre-allocated client ID
	bool connected;
	if (strlen(MQTT_USER) > 0) {
		connected = mqttClient.connect(clientId, MQTT_USER, MQTT_PASSWORD);
	} else {
		connected = mqttClient.connect(clientId);
	}

	if (connected) {
		log("MQTT connected!");
		mqttConsecutiveFailures = 0;  // Reset failure counter on successful connection

		// Seed random number generator with unique values per driver
		IPAddress ip = WiFi.localIP();
		uint16_t seed = (millis() & 0xFFFF) ^ (ip[2] << 8) ^ ip[3];
		random16_set_seed(seed);
		log("Random seed initialized: " + String(seed));

		// Subscribe to topics with QoS 2 (exactly-once delivery) using pre-allocated buffers
		mqttClient.subscribe(MQTT_TOPIC_TEST, 2);
		mqttClient.subscribe(topicConfig, 2);
		mqttClient.subscribe(topicTest, 2);
		mqttClient.subscribe(topicReset, 2);
		mqttClient.subscribe(topicReboot, 2);
		mqttClient.subscribe(topicLogging, 2);
		mqttClient.subscribe(topicClearEffects, 2);
		mqttClient.subscribe(topicWifi, 2);

		log("Subscribed to topics with QoS 2:");
		log("  - " + String(MQTT_TOPIC_TEST));
		log("  - " + String(topicConfig) + " (config via MAC)");
		log("  - " + String(topicLogging) + " (logging config via MAC)");
		log("  - " + String(topicTest));
		log("  - " + String(topicReset));
		log("  - " + String(topicReboot));
		log("  - " + String(topicClearEffects));
		log("  - " + String(topicWifi));

		// Load saved remote logging level from NVS
		String savedLoggingLevel = ConfigNVS::loadLoggingLevel();
		setRemoteLoggingLevel(savedLoggingLevel);
		log("Remote logging level loaded from NVS: " + savedLoggingLevel);

		// Update display to show MQTT connected
		if (Display::isAvailable()) {
			Display::updateMQTTStatus(true);
		}

		// Publish "online" status (retained) - overrides LWT offline message
		// QoS 1 is sufficient since LWT handles offline detection
		mqttClient.publish(topicStatus, "online", true, 1);
		log("Published status: online to " + String(topicStatus));

		// FIRST: Send crash report if we recovered from a crash
		// This must happen before anything else to ensure crash data reaches Hub
		// even if we crash again shortly after (e.g., when processing LED config)
		publishCrashReport();

		// Process MQTT protocol before sending more messages
		// This allows QoS acknowledgments to complete and prevents connection issues
		mqttClient.loop();

		// Send initial driver telemetry
		sendDriverTelemetry();

		// Process MQTT protocol again before final publish
		mqttClient.loop();

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
			mqttServerDiscovered = false;
			mqttServerIP[0] = '\0';
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

// Pre-allocated buffer for telemetry serialization (avoids heap fragmentation)
static char telemetryBuffer[1024];

// Pre-allocated buffer for effect error messages
static char effectErrorBuffer[512];

// Send driver telemetry message (initial connection and periodic heartbeat)
void sendDriverTelemetry() {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	// Get full system telemetry (including LED config)
	JsonDocument doc = Telemetry::getTelemetry(g_driverConfig, g_configReceived);

	// Serialize to pre-allocated buffer (avoids String heap allocation)
	size_t len = serializeJson(doc, telemetryBuffer, sizeof(telemetryBuffer));

	// Publish to unified telemetry topic with QoS 0 (fire-and-forget)
	// QoS 0 is appropriate for periodic telemetry - missing one message is acceptable
	// since identical data is resent every 10 seconds
	bool result = mqttClient.publish("rgfx/system/driver/telemetry", telemetryBuffer, false, 0);

	if (result) {
		log("Driver telemetry sent (QoS 0)");
	} else {
		log("Failed to send driver telemetry");
		char errBuf[64];
		snprintf(errBuf, sizeof(errBuf), "Payload size: %u bytes, Error: %d", (unsigned)len, mqttClient.lastError());
		log(errBuf);
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

	// Publish state with RETAIN flag and QoS 1 (at-least-once delivery)
	// QoS 1 is more reliable than QoS 2 for rapid publishes and sufficient for state sync
	// Retained messages ensure Hub receives state even if it subscribes late
	bool result = mqttClient.publish(topic.c_str(), state.c_str(), true, 1);

	if (result) {
		log("Published test state: " + state + " to " + topic);
	} else {
		log("Failed to publish test state");
	}
}

// Publish error to Hub (with optional payload/props)
void publishError(const char* source, const char* errorMessage, JsonDocument& props) {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	String deviceId = Utils::getDeviceId();

	// Build JSON error message with nested props
	JsonDocument doc;
	doc["driverId"] = deviceId;
	doc["source"] = source;
	doc["error"] = errorMessage;
	doc["payload"] = props;

	size_t len = serializeJson(doc, effectErrorBuffer, sizeof(effectErrorBuffer));

	if (len >= sizeof(effectErrorBuffer)) {
		log("Error payload too large, truncated");
	}

	// Publish to system error topic with QoS 0 (fire-and-forget)
	bool result = mqttClient.publish("rgfx/system/driver/error", effectErrorBuffer, false, 0);

	if (result) {
		log("Published error: " + String(source) + " - " + String(errorMessage));
	}
}

// Publish error to Hub (simple version without payload)
void publishError(const char* source, const char* errorMessage) {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	String deviceId = Utils::getDeviceId();

	// Build JSON error message
	JsonDocument doc;
	doc["driverId"] = deviceId;
	doc["source"] = source;
	doc["error"] = errorMessage;

	size_t len = serializeJson(doc, effectErrorBuffer, sizeof(effectErrorBuffer));

	if (len >= sizeof(effectErrorBuffer)) {
		log("Error payload too large, truncated");
	}

	// Publish to system error topic with QoS 0 (fire-and-forget)
	bool result = mqttClient.publish("rgfx/system/driver/error", effectErrorBuffer, false, 0);

	if (result) {
		log("Published error: " + String(source) + " - " + String(errorMessage));
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

			// Clear LEDs when turning off test mode
			if (effectProcessor != nullptr) {
				effectProcessor->clearEffects();
			}

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
