#pragma once

#include <atomic>
#include "graphics/matrix.h"

/**
 * Network Initialization Module
 *
 * Handles WiFi connection, OTA setup, mDNS, MQTT, and UDP initialization.
 * Called when WiFi state changes.
 */

// Setup state flags (declared in main.cpp)
// std::atomic ensures proper memory ordering across ESP32 cores
// (volatile alone is insufficient for multi-core synchronization on Xtensa)
extern std::atomic<bool> mqttSetupDone;
extern std::atomic<bool> udpSetupDone;
extern std::atomic<bool> otaSetupDone;
extern std::atomic<bool> otaInProgress;           // Track OTA upload state
extern std::atomic<bool> pendingClearEffects;     // Request effect clear from Core 1
extern std::atomic<bool> pendingRestart;          // Restart requested - stop all operations

// Initialize all network services when WiFi connects
void setupNetworkServices(Matrix& matrix);
void setupNetworkServices();  // Overload without Matrix for when it's not ready

// Cleanup network services when WiFi disconnects
void cleanupNetworkServices(Matrix& matrix);
void cleanupNetworkServices();  // Overload without Matrix for when it's not ready
