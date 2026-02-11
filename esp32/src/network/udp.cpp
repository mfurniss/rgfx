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

	int packetsProcessed = 0;
	int packetSize;

	// Drain all available packets (up to queue size) to batch them before rendering
	// This prevents visible latency when multiple effects are broadcast in quick succession
	// IMPORTANT: Check packetsProcessed BEFORE parsePacket() — parsePacket() allocates an
	// internal rx_buffer that must be consumed before the next call, otherwise it returns 0
	// forever (WiFiUDP::parsePacket exits early if rx_buffer exists)
	while (packetsProcessed < UDP_QUEUE_SIZE) {
		packetSize = udp.parsePacket();
		if (packetSize <= 0) break;

		// Bounds check: reject packets larger than our buffer
		if (packetSize > UDP_BUFFER_SIZE - 1) {
			udp.flush();  // Must consume rx_buffer before next parsePacket()
			log("UDP RX: Packet too large (" + String(packetSize) +
			    " bytes, max " + String(UDP_BUFFER_SIZE - 1) + "), dropping");
			udpMessagesDropped++;
			packetsProcessed++;
			continue;
		}

		// Get source IP of the packet
		IPAddress sourceIP = udp.remoteIP();

		// Only accept packets from the Hub (MQTT broker IP)
		// mqttServerIP is set during broker discovery (empty if not discovered yet)
		if (mqttServerDiscovered && mqttServerIP[0] != '\0') {
			IPAddress hubIP;
			if (hubIP.fromString(mqttServerIP)) {
				if (sourceIP != hubIP) {
					udp.flush();  // Must consume rx_buffer before next parsePacket()
					log("UDP RX: Rejected packet from unauthorized source " + sourceIP.toString() +
					    " (expected " + hubIP.toString() + ")");
					packetsProcessed++;
					continue;
				}
			}
		} else {
			// Hub not discovered yet - reject all UDP packets for security
			udp.flush();  // Must consume rx_buffer before next parsePacket()
			log("UDP RX: Rejected packet from " + sourceIP.toString() + " (Hub not discovered yet)");
			packetsProcessed++;
			continue;
		}

		// Read directly into queue slot to avoid stack allocation
		// (4KB temp buffer would overflow ESP32's ~8KB stack)
		if (messageQueue.count < UDP_QUEUE_SIZE) {
			uint8_t idx = messageQueue.head;
			int len = udp.read(messageQueue.messages[idx].buffer, UDP_BUFFER_SIZE - 1);
			if (len > 0) {
				messageQueue.messages[idx].buffer[len] = '\0';
				messageQueue.messages[idx].length = static_cast<uint16_t>(len);
				messageQueue.head = (messageQueue.head + 1) % UDP_QUEUE_SIZE;
				messageQueue.count++;
				udpMessagesReceived++;
			}
		} else {
			// Queue full - must consume rx_buffer to allow future parsePacket() calls
			udp.flush();
			log("UDP RX: Queue full, dropping message");
			udpMessagesDropped++;

			// Report to Hub (rate limited - only on first drop in a batch)
			static uint32_t lastDropReportTime = 0;
			uint32_t now = millis();
			if (now - lastDropReportTime > 5000) {  // Max once per 5 seconds
				publishError("udp", "Queue full - dropping messages");
				lastDropReportTime = now;
			}
		}
		packetsProcessed++;
	}

	// Safety: ensure no stale data blocks future parsePacket() calls
	if (udp.available()) {
		udp.flush();
		log("UDP: Flushed unconsumed rx_buffer (safety catch)");
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

uint8_t getUdpQueueDepth() {
	return messageQueue.count;
}

void reinitializeUDP() {
	log("Reinitializing UDP socket...");
	udp.stop();
	delay(10);  // Allow socket cleanup
	setupUDP();
}
