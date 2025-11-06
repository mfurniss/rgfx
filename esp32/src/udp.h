#ifndef UDP_H
#define UDP_H

#include <Arduino.h>
#include <WiFiUdp.h>
#include "config/constants.h"

// Network constants defined in config/constants.h:
// - UDP_PORT: Port to listen on for UDP messages
// - UDP_BUFFER_SIZE: Buffer size for incoming messages

struct UDPMessage {
	String effect;
	uint32_t color;
	uint32_t duration;  // Pulse duration in milliseconds (default: 150)
	bool fade;          // Whether pulse should fade (default: true)
};

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPMessage(UDPMessage* message);

#endif
