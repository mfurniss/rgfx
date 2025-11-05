/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#ifndef SERIAL_H
#define SERIAL_H

#include <Arduino.h>

/**
 * Thread-safe serial command handler module.
 *
 * Provides mutex-protected serial I/O to prevent corruption when multiple cores
 * access Serial simultaneously (Core 0: network logging, Core 1: command input).
 *
 * Features:
 * - Character-by-character buffering with atomic line processing
 * - Echo-back for user confirmation
 * - Printable ASCII validation
 * - Thread-safe logging wrapper
 */
namespace SerialCommand {

/**
 * Initialize serial command system.
 * Creates mutex for thread-safe Serial access.
 * Call once in setup().
 */
void begin();

/**
 * Process incoming serial commands.
 * Reads characters, buffers input, and processes complete lines.
 * Call regularly in loop().
 */
void process();

/**
 * Thread-safe logging wrapper.
 * Acquires mutex before writing to Serial to prevent corruption.
 * Use this instead of Serial.println() when logging from any core.
 *
 * @param message - String to print to Serial
 */
void log(const String& message);

} // namespace SerialCommand

#endif
