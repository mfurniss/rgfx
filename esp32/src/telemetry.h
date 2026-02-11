#ifndef TELEMETRY_H
#define TELEMETRY_H

#include <ArduinoJson.h>

// FPS getters (defined in main.cpp)
float getCurrentFps();
float getMinFps();
float getMaxFps();

// System telemetry utilities
class Telemetry {
   public:
	// Get complete system telemetry as JSON document
	static JsonDocument getTelemetry();
};

#endif
