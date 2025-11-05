/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "../serial.h"
#include <Arduino.h>

namespace Commands {

	void help(const String& args) {
		SerialCommand::log("\n=== RGFX Driver Serial Commands ===");
		SerialCommand::log("wifi SSID PASSWORD   - Set WiFi credentials and restart");
		SerialCommand::log(
			"                       Supports quoted strings for SSIDs/passwords with spaces");
		SerialCommand::log("                       Example: wifi MyNetwork MyPassword123");
		SerialCommand::log(
			"                       Example: wifi \"My Network\" \"My Password 123\"");
		SerialCommand::log("factory_reset        - Erase WiFi credentials and restart");
		SerialCommand::log("sys_info             - Display system information (JSON)");
		SerialCommand::log("help                 - Show this help message");
	}

}  // namespace Commands
