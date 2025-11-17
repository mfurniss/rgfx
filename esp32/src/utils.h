#ifndef UTILS_H
#define UTILS_H

#include <Arduino.h>

// Shared utility functions
class Utils {
   public:
	// Get device ID from NVS
	// Returns full ID like "rgfx-driver-0001"
	static String getDeviceId();

	// Set device ID (saves to NVS)
	static void setDeviceId(const String& deviceId);
};

#endif
