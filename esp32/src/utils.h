#ifndef UTILS_H
#define UTILS_H

#include <Arduino.h>

// Shared utility functions
class Utils {
  public:
	// Get stable 6-character device ID from MAC address (last 3 bytes)
	// Returns lowercase hex string like "ddeeff"
	static String getDeviceId();

	// Get full device name with prefix
	// Returns "rgfx-driver-ddeeff"
	static String getDeviceName();
};

#endif
