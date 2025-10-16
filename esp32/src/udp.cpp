#include "udp.h"
#include "log.h"

WiFiUDP udp;

// UDP message handling
volatile bool newColorAvailable = false;
volatile uint32_t pendingColor = 0;

void setupUDP() {
	if (udp.begin(UDP_PORT)) {
		log("UDP listener started on port " + String(UDP_PORT));
	} else {
		log("ERROR: Failed to start UDP listener!");
	}
}

// Check for UDP packets and process them (call from main loop)
void processUDP() {
	int packetSize = udp.parsePacket();
	if (packetSize > 0) {
		char buffer[UDP_BUFFER_SIZE];
		int len = udp.read(buffer, UDP_BUFFER_SIZE - 1);
		if (len > 0) {
			buffer[len] = '\0';  // Null terminate
			pendingColor = (uint32_t) strtol(buffer, NULL, 16);
			newColorAvailable = true;
			// Serial.printf("UDP RX: color=%s\n", buffer);  // Disabled - too spammy
		}
	}
}

// Check for UDP color updates and apply them (call from main loop)
bool checkUDPColor(uint32_t* color) {
	if (newColorAvailable) {
		*color = pendingColor;
		newColorAvailable = false;
		return true;
	}
	return false;
}
