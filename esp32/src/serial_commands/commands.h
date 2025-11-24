/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#ifndef COMMANDS_H
#define COMMANDS_H

#include <Arduino.h>

/**
 * Serial command handlers.
 *
 * Each command is implemented in its own file (e.g., wifi.cpp, reset.cpp).
 * Commands are registered in a lookup table in serial.cpp.
 */
namespace Commands {

	/**
	 * Command handler function signature.
	 * @param args - Arguments string after the command name
	 */
	typedef void (*CommandHandler)(const String& args);

	/**
	 * WiFi configuration command.
	 * Format: wifi SSID PASSWORD
	 * Supports quoted strings for SSIDs/passwords with spaces.
	 */
	void wifi(const String& args);

	/**
	 * Factory reset command.
	 * Erases all WiFi credentials and restarts device.
	 */
	void reset(const String& args);

	/**
	 * Reboot command.
	 * Restarts the device without erasing configuration.
	 */
	void reboot(const String& args);

	/**
	 * Help command.
	 * Displays list of available commands and usage.
	 */
	void help(const String& args);

	/**
	 * System telemetry command.
	 * Displays device telemetry including network, chip, memory, and uptime.
	 */
	void telemetry(const String& args);

	/**
	 * LED test command.
	 * Format: test_leds on|off
	 * Enables/disables LED test pattern.
	 */
	void testLeds(const String& args);

}  // namespace Commands

#endif
