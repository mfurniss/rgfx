#include "network/udp.h"
#include "log.h"
#include <ArduinoJson.h>

WiFiUDP udp;

// UDP message handling
volatile bool newMessageAvailable = false;
UDPMessage pendingMessage;
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

// Check for UDP packets and process them (call from main loop)
void processUDP() {
	if (!udpInitialized) {
		return;
	}
	int packetSize = udp.parsePacket();
	if (packetSize > 0) {
		char buffer[UDP_BUFFER_SIZE];
		int len = udp.read(buffer, UDP_BUFFER_SIZE - 1);
		if (len > 0) {
			buffer[len] = '\0';  // Null terminate

			// Parse JSON
			JsonDocument doc;
			DeserializationError error = deserializeJson(doc, buffer);

			if (!error) {
				udpMessagesReceived++;  // Increment counter for valid UDP messages

				// Extract effect name
				if (doc["effect"]) {
					pendingMessage.effect = doc["effect"].as<String>();
				}

				// Copy entire props object
				pendingMessage.props = doc["props"];

				newMessageAvailable = true;
				log("UDP RX: effect=" + pendingMessage.effect);
			} else {
				log("UDP RX: JSON parse error: " + String(error.c_str()));
			}
		}
	}
}

// Check for UDP message updates (call from main loop)
bool checkUDPMessage(UDPMessage* message) {
	if (newMessageAvailable) {
		*message = pendingMessage;
		newMessageAvailable = false;
		return true;
	}
	return false;
}
