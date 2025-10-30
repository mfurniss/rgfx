#include "udp.h"
#include "log.h"
#include <ArduinoJson.h>

WiFiUDP udp;

// UDP message handling
volatile bool newMessageAvailable = false;
UDPMessage pendingMessage;
static bool udpInitialized = false;

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
			buffer[len] = '\0'; // Null terminate

			// Parse JSON
			JsonDocument doc;
			DeserializationError error = deserializeJson(doc, buffer);

			if (!error) {
				// Extract effect
				if (doc["effect"]) {
					pendingMessage.effect = doc["effect"].as<String>();
				}

				// Extract color from props object
				const char* colorHex = nullptr;
				if (doc["props"]["color"]) {
					colorHex = doc["props"]["color"];
				}

				// Parse color hex (strip # prefix if present)
				if (colorHex) {
					if (colorHex[0] == '#') {
						colorHex++; // Skip # prefix
					}
					pendingMessage.color = (uint32_t)strtol(colorHex, NULL, 16);
				} else {
					pendingMessage.color = 0xFFFFFF; // Default white
				}

				newMessageAvailable = true;
				log("UDP RX: effect=" + pendingMessage.effect + " color=0x" + String(pendingMessage.color, HEX));
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
