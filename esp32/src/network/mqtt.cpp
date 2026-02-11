#include "network/mqtt.h"
#include "network/udp.h"
#include "telemetry.h"
#include "log.h"
#include "utils.h"
#include "config/constants.h"
#include "config/config_nvs.h"
#include "effects/effect_processor.h"
#include "network/network_init.h"
#include "crash_handler.h"
#include <WiFi.h>

// Forward declaration - defined in mqtt_callback.cpp
void mqttCallback(String& topic, String& payload);

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

extern EffectProcessor* effectProcessor;

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

		// Clear any lingering effects from before reconnection
		if (effectProcessor != nullptr) {
			effectProcessor->clearEffects();
		}

		// Seed random number generator with unique values per driver
		IPAddress ip = WiFi.localIP();
		uint16_t seed = (millis() & 0xFFFF) ^ (ip[2] << 8) ^ ip[3];
		random16_set_seed(seed);
		log("Random seed initialized: " + String(seed));

		// Subscribe to topics with QoS 2 (exactly-once delivery) using pre-allocated buffers
		// Check return values to detect subscription failures (can happen after crash recovery)
		bool allSubscribed = true;
		allSubscribed &= mqttClient.subscribe(MQTT_TOPIC_TEST, 2);
		allSubscribed &= mqttClient.subscribe(topicConfig, 2);
		allSubscribed &= mqttClient.subscribe(topicTest, 2);
		allSubscribed &= mqttClient.subscribe(topicReset, 2);
		allSubscribed &= mqttClient.subscribe(topicReboot, 2);
		allSubscribed &= mqttClient.subscribe(topicLogging, 2);
		allSubscribed &= mqttClient.subscribe(topicClearEffects, 2);
		allSubscribed &= mqttClient.subscribe(topicWifi, 2);

		if (!allSubscribed) {
			log("One or more MQTT subscriptions failed - forcing reconnect", LogLevel::ERROR);
			mqttClient.disconnect();
			return;
		}

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

		// Process MQTT protocol again
		mqttClient.loop();
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
