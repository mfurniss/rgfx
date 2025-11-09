/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "log.h"
#include <Arduino.h>

namespace Commands {

	void help(const String& args) {
		log("\n=== RGFX Driver Serial Commands ===");
		log("wifi SSID PASSWORD   - Set WiFi credentials and restart");
		log("                       Supports quoted strings for SSIDs/passwords with spaces");
		log("                       Example: wifi MyNetwork MyPassword123");
		log("                       Example: wifi \"My Network\" \"My Password 123\"");
		log("factory_reset        - Erase WiFi credentials and restart");
		log("sys_info             - Display system information (JSON)");
		log("test_leds on|off     - Enable/disable LED test pattern");
		log("help                 - Show this help message");
	}

}  // namespace Commands
