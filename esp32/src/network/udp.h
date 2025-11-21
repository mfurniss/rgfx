#ifndef UDP_H
#define UDP_H

#include <Arduino.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>
#include "config/constants.h"

// Network constants defined in config/constants.h:
// - UDP_PORT: Port to listen on for UDP messages
// - UDP_BUFFER_SIZE: Buffer size for incoming messages

struct UDPMessage {
	String effect;
	JsonDocument props;
};

// UDP message statistics
extern uint32_t udpMessagesReceived;

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPMessage(UDPMessage* message);

#endif
