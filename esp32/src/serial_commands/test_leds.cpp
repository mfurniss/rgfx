/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "../serial.h"
#include "../matrix.h"
#include "../effects/test.h"
#include "../mqtt.h"
#include <FastLED.h>
#include <WiFi.h>

extern Matrix matrix;
extern bool testModeActive;

namespace Commands {

	void testLeds(const String& args) {
		String arg = args;
		arg.trim();
		arg.toLowerCase();

		if (arg == "on") {
			// Enable test mode and show test pattern
			testModeActive = true;
			test(matrix, 0);
			FastLED.show();
			SerialCommand::log("Test mode ENABLED - LEDs showing test pattern");

			// Notify Hub of test state change
			publishTestState("on");
		} else if (arg == "off") {
			// Disable test mode and clear LEDs
			testModeActive = false;
			fill_solid(matrix.leds, matrix.size, CRGB::Black);
			FastLED.show();
			SerialCommand::log("Test mode DISABLED - LEDs cleared");

			// Notify Hub of test state change
			publishTestState("off");
		} else {
			SerialCommand::log("Usage: test_leds on|off");
		}
	}

}  // namespace Commands
