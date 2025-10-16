#ifndef UDP_H
#define UDP_H

#include <Arduino.h>
#include <WiFiUdp.h>

#define UDP_PORT 1234  // Port to listen on for UDP messages
#define UDP_BUFFER_SIZE 64

// Function declarations
void setupUDP();
void processUDP();
bool checkUDPColor(uint32_t* color);

#endif
