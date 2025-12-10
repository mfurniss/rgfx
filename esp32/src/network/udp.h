#ifndef UDP_H
#define UDP_H

#include <Arduino.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>
#include "config/constants.h"

// Network constants defined in config/constants.h:
// - UDP_PORT: Port to listen on for UDP messages
// - UDP_BUFFER_SIZE: Buffer size for incoming messages

// Queue capacity - 8 messages handles burst traffic
static const uint8_t UDP_QUEUE_SIZE = 8;

// Parsed UDP message (returned by checkUDPMessage)
struct UDPMessage {
	String effect;
	JsonDocument props;
};

// Raw message buffer for queue (avoids JsonDocument heap fragmentation)
struct UDPRawMessage {
	char buffer[UDP_BUFFER_SIZE];
	uint16_t length;
};

// Circular queue for UDP messages
struct UDPMessageQueue {
	UDPRawMessage messages[UDP_QUEUE_SIZE];
	volatile uint8_t head;   // Next write position
	volatile uint8_t tail;   // Next read position
	volatile uint8_t count;  // Messages in queue
};

// UDP message statistics
extern uint32_t udpMessagesReceived;

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPMessage(UDPMessage* message);

#endif
