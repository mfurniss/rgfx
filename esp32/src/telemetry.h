#ifndef TELEMETRY_H
#define TELEMETRY_H

#include <ArduinoJson.h>
#include "driver_config.h"

// System telemetry utilities
class Telemetry {
   public:
	// Get complete system telemetry as JSON document
	// Returns populated JsonDocument with device info, network, chip, memory, LED config, etc.
	static JsonDocument getTelemetry(const DriverConfigData& driverConfig, bool configReceived);
};

#endif
