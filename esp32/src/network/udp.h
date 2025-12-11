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

// Maximum effect name length (e.g., "explode", "pulse", "wipe")
static const size_t MAX_EFFECT_NAME_LENGTH = 32;

// Parsed UDP message (returned by checkUDPMessage)
// Uses fixed char buffer to avoid heap fragmentation from String
struct UDPMessage {
	char effect[MAX_EFFECT_NAME_LENGTH];
	JsonDocument props;
};

// Raw message buffer for queue (avoids JsonDocument heap fragmentation)
struct UDPRawMessage {
	char buffer[UDP_BUFFER_SIZE];
	uint16_t length;
};

/**
 * Circular queue for UDP messages
 *
 * THREAD SAFETY: This queue is accessed ONLY from Core 1 (main loop).
 * Both processUDP() (producer) and checkUDPMessage() (consumer) run on
 * the same core, so no cross-core synchronization is required.
 *
 * The volatile qualifiers are retained for ISR safety (futureproofing)
 * but are NOT required for the current single-threaded access pattern.
 * If cross-core access is ever needed, replace with std::atomic or
 * use a FreeRTOS queue.
 */
struct UDPMessageQueue {
	UDPRawMessage messages[UDP_QUEUE_SIZE];
	volatile uint8_t head;   // Next write position (Core 1 only)
	volatile uint8_t tail;   // Next read position (Core 1 only)
	volatile uint8_t count;  // Messages in queue (Core 1 only)
};

// UDP message statistics
extern uint32_t udpMessagesReceived;
extern uint32_t udpMessagesDropped;

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPMessage(UDPMessage* message);

#endif
