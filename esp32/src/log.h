#pragma once

#ifdef UNIT_TEST
#include "../test/mocks/mock_arduino.h"
#else
#include <Arduino.h>
#endif

/**
 * Log level for categorizing log messages
 */
enum class LogLevel {
	INFO,
	ERROR
};

/**
 * Log a message to serial and optionally to the Hub via MQTT
 *
 * @param message - The message to log
 * @param level - Log level (INFO or ERROR), defaults to INFO
 */
void log(const char* message, LogLevel level = LogLevel::INFO);
#ifndef UNIT_TEST
void log(const String& message, LogLevel level = LogLevel::INFO);
#endif

#ifndef UNIT_TEST
/**
 * Set the remote logging level (called when Hub sends logging config)
 *
 * @param level - "all", "errors", or "off"
 */
void setRemoteLoggingLevel(const String& level);

/**
 * Get the current remote logging level
 *
 * @return Current logging level string ("all", "errors", or "off")
 */
String getRemoteLoggingLevel();

/**
 * Initialize the log queue for thread-safe remote logging
 * Must be called during setup before any logging occurs
 */
void initLogQueue();

/**
 * Process pending log messages from the queue and publish via MQTT
 * MUST be called from Core 0 (network task) to ensure thread-safe MQTT access
 */
void processLogQueue();
#endif
