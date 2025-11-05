/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "serial.h"
#include "config/constants.h"
#include "serial_commands/commands.h"
#include <freertos/semphr.h>
#include <map>

namespace SerialCommand {

// Mutex for thread-safe Serial access
static SemaphoreHandle_t serialMutex = nullptr;

// Input buffer for serial commands
static char inputBuffer[SERIAL_BUFFER_SIZE];
static int bufferIndex = 0;

// Command lookup table (command name -> handler function)
static std::map<String, Commands::CommandHandler> commandRegistry = {
	{"wifi", Commands::wifi},
	{"factory_reset", Commands::factoryReset},
	{"help", Commands::help},
};

void begin() {
	// Create mutex for Serial synchronization between cores
	serialMutex = xSemaphoreCreateMutex();
	if (!serialMutex) {
		Serial.println("ERROR: Failed to create serial mutex!");
	}
}

void log(const String& message) {
	if (!serialMutex) {
		// Fallback if mutex not initialized
		Serial.println(message);
		return;
	}

	// Acquire mutex, print message, release mutex
	xSemaphoreTake(serialMutex, portMAX_DELAY);
	Serial.println(message);
	xSemaphoreGive(serialMutex);
}

/**
 * Validate that a string contains only printable ASCII characters.
 * Detects corruption from interleaved log output.
 */
static bool isValidInput(const String& str) {
	for (size_t i = 0; i < str.length(); i++) {
		if (!isprint((unsigned char)str[i])) {
			return false;
		}
	}
	return true;
}

/**
 * Process a complete command line.
 */
static void handleCommand(const String& cmd) {
	if (cmd.length() == 0) {
		return;
	}

	// Validate input (detect corruption)
	if (!isValidInput(cmd)) {
		log("ERROR: Corrupted input detected (contains non-printable characters)");
		return;
	}

	String trimmedCmd = cmd;
	trimmedCmd.trim();

	// Parse command name and arguments
	String commandName;
	String args;

	int spacePos = trimmedCmd.indexOf(' ');
	if (spacePos > 0) {
		commandName = trimmedCmd.substring(0, spacePos);
		args = trimmedCmd.substring(spacePos + 1);
		args.trim();
	} else {
		commandName = trimmedCmd;
		args = "";
	}

	// Look up command in registry
	auto it = commandRegistry.find(commandName);
	if (it != commandRegistry.end()) {
		// Execute command handler
		it->second(args);
	} else {
		log("Unknown command: " + commandName);
		log("Type 'help' for available commands");
	}
}

void process() {
	// Read available characters from serial
	while (Serial.available()) {
		char c = Serial.read();

		// Handle newline (command complete)
		if (c == '\n' || c == '\r') {
			if (bufferIndex > 0) {
				// Null-terminate and process command
				inputBuffer[bufferIndex] = '\0';

				// Echo newline for clean output
				log("");

				// Process the complete command line
				String cmd(inputBuffer);
				handleCommand(cmd);

				// Reset buffer for next command
				bufferIndex = 0;
			}
		}
		// Handle backspace
		else if (c == '\b' || c == 127) {
			if (bufferIndex > 0) {
				bufferIndex--;
				// Echo backspace sequence to terminal
				Serial.write('\b');
				Serial.write(' ');
				Serial.write('\b');
			}
		}
		// Handle printable characters
		else if (c >= 32 && c < 127 && bufferIndex < SERIAL_BUFFER_SIZE - 1) {
			// Add to buffer
			inputBuffer[bufferIndex++] = c;

			// Echo character back to user (visual confirmation)
			Serial.write(c);
		}
	}
}

} // namespace SerialCommand
