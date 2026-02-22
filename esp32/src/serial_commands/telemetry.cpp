#include "commands.h"
#include "log.h"
#include "telemetry.h"
#include <Arduino.h>
#include <ArduinoJson.h>

namespace Commands {

	void telemetry(const String& args) {
		// Get system telemetry (including LED config)
		JsonDocument doc = Telemetry::getTelemetry();

		// Output formatted JSON to serial
		log("\n=== System Telemetry ===");
		serializeJsonPretty(doc, Serial);
		log("");  // Newline after JSON
	}

}  // namespace Commands
