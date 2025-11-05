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

// Initialize all network services when WiFi connects
void setupNetworkServices(Matrix& matrix);

// Cleanup network services when WiFi disconnects
void cleanupNetworkServices(Matrix& matrix);
