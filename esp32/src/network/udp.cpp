#include "network/udp.h"
#include "network/mqtt.h"
#include "log.h"
#include <ArduinoJson.h>
#include <cstring>

WiFiUDP udp;

// Circular queue for UDP messages (raw JSON strings to avoid heap fragmentation)
static UDPMessageQueue messageQueue = {};
static bool udpInitialized = false;

// UDP message statistics
uint32_t udpMessagesReceived = 0;
uint32_t udpMessagesDropped = 0;

// JSON parse failure tracking - detects protocol mismatches or corrupted data
static uint8_t consecutiveParseFailures = 0;
static const uint8_t MAX_PARSE_FAILURES_BEFORE_WARNING = 20;

void setupUDP() {
	if (udp.begin(UDP_PORT)) {
		log("UDP listener started on port " + String(UDP_PORT));
		udpInitialized = true;
	} else {
		log("ERROR: Failed to start UDP listener!");
		udpInitialized = false;
	}
}

/**
 * Check for UDP packets and enqueue them
 *
 * IMPORTANT: Must be called from Core 1 (main loop) only.
 * This is the producer side of the UDP message queue.
 */
void processUDP() {
	if (!udpInitialized) {
		return;
	}
	int packetSize = udp.parsePacket();
	if (packetSize > 0) {
		// Bounds check: reject packets larger than our buffer
		if (packetSize > UDP_BUFFER_SIZE - 1) {
			log("UDP RX: Packet too large (" + String(packetSize) +
			    " bytes, max " + String(UDP_BUFFER_SIZE - 1) + "), dropping");
			udpMessagesDropped++;
			return;
		}

		// Get source IP of the packet
		IPAddress sourceIP = udp.remoteIP();

		// Only accept packets from the Hub (MQTT broker IP)
		// mqttServerIP is set during broker discovery (empty if not discovered yet)
		if (mqttServerDiscovered && mqttServerIP[0] != '\0') {
			IPAddress hubIP;
			if (hubIP.fromString(mqttServerIP)) {
				if (sourceIP != hubIP) {
					log("UDP RX: Rejected packet from unauthorized source " + sourceIP.toString() +
					    " (expected " + hubIP.toString() + ")");
					return;
				}
			}
		} else {
			// Hub not discovered yet - reject all UDP packets for security
			log("UDP RX: Rejected packet from " + sourceIP.toString() + " (Hub not discovered yet)");
			return;
		}

		char buffer[UDP_BUFFER_SIZE];
		int len = udp.read(buffer, UDP_BUFFER_SIZE - 1);
		if (len > 0) {
			buffer[len] = '\0';  // Null terminate

			// Enqueue raw JSON string (parse later when dequeuing)
			if (messageQueue.count < UDP_QUEUE_SIZE) {
				uint8_t idx = messageQueue.head;
				memcpy(messageQueue.messages[idx].buffer, buffer, len + 1);
				messageQueue.messages[idx].length = static_cast<uint16_t>(len);
				messageQueue.head = (messageQueue.head + 1) % UDP_QUEUE_SIZE;
				messageQueue.count++;
				udpMessagesReceived++;
			} else {
				log("UDP RX: Queue full, dropping message");
				udpMessagesDropped++;
			}
		}
	}
}

/**
 * Dequeue and parse next UDP message
 *
 * IMPORTANT: Must be called from Core 1 (main loop) only.
 * This is the consumer side of the UDP message queue.
 */
bool checkUDPMessage(UDPMessage* message) {
	if (messageQueue.count == 0) {
		return false;
	}

	// Dequeue raw message
	uint8_t idx = messageQueue.tail;
	const char* buffer = messageQueue.messages[idx].buffer;

	// Parse JSON
	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, buffer);

	// Advance tail regardless of parse success (consume the slot)
	messageQueue.tail = (messageQueue.tail + 1) % UDP_QUEUE_SIZE;
	messageQueue.count--;

	if (error) {
		consecutiveParseFailures++;
		log("UDP: JSON parse error: " + String(error.c_str()));
		if (consecutiveParseFailures >= MAX_PARSE_FAILURES_BEFORE_WARNING) {
			log("UDP: " + String(consecutiveParseFailures) + " consecutive parse failures - possible protocol mismatch", LogLevel::ERROR);
			consecutiveParseFailures = 0;  // Reset to avoid spamming
		}
		return false;
	}

	// Reset failure counter on successful parse
	consecutiveParseFailures = 0;

	// Extract effect name and props
	// Use const char* to avoid String heap allocation
	const char* effectName = doc["effect"] | "";
	size_t nameLen = strlen(effectName);
	if (nameLen >= MAX_EFFECT_NAME_LENGTH) {
		log("UDP: Effect name truncated (was " + String(nameLen) + " chars)", LogLevel::ERROR);
	}
	strncpy(message->effect, effectName, MAX_EFFECT_NAME_LENGTH - 1);
	message->effect[MAX_EFFECT_NAME_LENGTH - 1] = '\0';
	message->props = doc["props"];

	return true;
}
