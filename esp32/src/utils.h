#ifndef UTILS_H
#define UTILS_H

#include <Arduino.h>

// Shared utility functions
class Utils {
   public:
	// Get device ID - priority: NVS custom ID, then MAC fallback
	// Returns custom ID like "0001" or MAC-based like "ddeeff"
	static String getDeviceId();

	// Get full device name with prefix
	// Returns "rgfx-driver-0001" or "rgfx-driver-ddeeff"
	static String getDeviceName();

	// Set custom device ID (saves to NVS)
	static void setDeviceId(const String& deviceId);
};

#endif
