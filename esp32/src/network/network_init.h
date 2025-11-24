#pragma once

#include "matrix.h"

/**
 * Network Initialization Module
 *
 * Handles WiFi connection, OTA setup, mDNS, MQTT, and UDP initialization.
 * Called when WiFi state changes.
 */

// Setup state flags (declared in main.cpp)
extern bool mqttSetupDone;
extern bool udpSetupDone;
extern bool otaSetupDone;
extern bool otaInProgress;  // Track OTA upload state

// OTA LED buffer for progress bar (declared in main.cpp)
extern CRGB* otaLEDs;
extern uint16_t otaLEDCount;

// Initialize all network services when WiFi connects
void setupNetworkServices(Matrix& matrix);
void setupNetworkServices();  // Overload without Matrix for when it's not ready

// Cleanup network services when WiFi disconnects
void cleanupNetworkServices(Matrix& matrix);
void cleanupNetworkServices();  // Overload without Matrix for when it's not ready
