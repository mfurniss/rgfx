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
				pendingMessage.effect = doc["effect"].as<String>();
				const char* colorHex = doc["color"];
				pendingMessage.color = (uint32_t)strtol(colorHex, NULL, 16);
				newMessageAvailable = true;
				log("UDP RX: " + String(buffer));
			} else {
				log("UPD RX: JSON parse error: " + String(error.c_str()));
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
