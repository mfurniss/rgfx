#include "driver_config.h"

// Global driver configuration instance
DriverConfigData g_driverConfig;

// Flag indicating whether configuration has been received from Hub
bool g_configReceived = false;

// Flag indicating config update is in progress (prevents race conditions)
volatile bool g_configUpdateInProgress = false;
