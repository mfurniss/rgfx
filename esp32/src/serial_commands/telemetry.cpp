/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "log.h"
#include "telemetry.h"
#include "driver_config.h"
#include <Arduino.h>
#include <ArduinoJson.h>

namespace Commands {

	void telemetry(const String& args) {
		// Get system telemetry (including LED config)
		JsonDocument doc = Telemetry::getTelemetry(g_driverConfig, g_configReceived);

		// Output formatted JSON to serial
		log("\n=== System Telemetry ===");
		serializeJsonPretty(doc, Serial);
		log("");  // Newline after JSON
	}

}  // namespace Commands
