#ifndef UDP_H
#define UDP_H

#include <Arduino.h>
#include <WiFiUdp.h>

#define UDP_PORT 1234 // Port to listen on for UDP messages
#define UDP_BUFFER_SIZE 256

struct UDPMessage {
	String effect;
	uint32_t color;
};

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPMessage(UDPMessage* message);

#endif
