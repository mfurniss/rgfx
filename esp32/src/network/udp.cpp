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

void setupUDP() {
	if (udp.begin(UDP_PORT)) {
		log("UDP listener started on port " + String(UDP_PORT));
		udpInitialized = true;
	} else {
		log("ERROR: Failed to start UDP listener!");
		udpInitialized = false;
	}
}

// Check for UDP packets and enqueue them (call from main loop)
void processUDP() {
	if (!udpInitialized) {
		return;
	}
	int packetSize = udp.parsePacket();
	if (packetSize > 0) {
		// Get source IP of the packet
		IPAddress sourceIP = udp.remoteIP();

		// Only accept packets from the Hub (MQTT broker IP)
		// MQTT_SERVER is set during broker discovery (empty if not discovered yet)
		if (MQTT_SERVER.length() > 0) {
			IPAddress hubIP;
			if (hubIP.fromString(MQTT_SERVER)) {
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
			}
		}
	}
}

// Dequeue and parse next UDP message (call from main loop)
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
		log("UDP: JSON parse error: " + String(error.c_str()));
		return false;
	}

	// Extract effect name and props
	if (doc["effect"]) {
		message->effect = doc["effect"].as<String>();
	}
	message->props = doc["props"];

	return true;
}
