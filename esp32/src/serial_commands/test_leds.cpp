/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "log.h"
#include "matrix.h"
#include "effects/effect_processor.h"
#include "network/mqtt.h"
#include <ArduinoJson.h>

extern Matrix* matrix;
extern bool testModeActive;
extern EffectProcessor* effectProcessor;

namespace Commands {

	void testLeds(const String& args) {
		String arg = args;
		arg.trim();
		arg.toLowerCase();

		if (arg == "on") {
			// Enable test mode
			testModeActive = true;
			log("Test mode ENABLED - showing test pattern");

			// Notify Hub of test state change
			publishTestState("on");
		} else if (arg == "off") {
			// Disable test mode
			testModeActive = false;

			// Clear LEDs when turning off test mode
			if (effectProcessor != nullptr) {
				effectProcessor->clearEffects();
			}

			log("Test mode DISABLED - LEDs cleared");

			// Notify Hub of test state change
			publishTestState("off");
		} else {
			log("Usage: test_leds on|off");
		}
	}

}  // namespace Commands
