#ifndef SYS_INFO_H
#define SYS_INFO_H

#include <ArduinoJson.h>
#include "driver_config.h"

// System information utilities
class SysInfo {
   public:
	// Get complete system information as JSON document
	// Returns populated JsonDocument with device info, network, chip, memory, LED config, etc.
	static JsonDocument getSysInfo(const DriverConfigData& driverConfig, bool configReceived);
};

#endif
