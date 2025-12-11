#include "driver_config.h"

// Global driver configuration instance
DriverConfigData g_driverConfig;

// Flag indicating whether configuration has been received from Hub
bool g_configReceived = false;

// Flag indicating config update is in progress (prevents race conditions)
// std::atomic ensures proper memory ordering across ESP32 cores
std::atomic<bool> g_configUpdateInProgress(false);

// Gamma correction lookup tables (256 bytes each)
// Initialized to linear (1:1 mapping) by default
uint8_t g_gammaLutR[256];
uint8_t g_gammaLutG[256];
uint8_t g_gammaLutB[256];
