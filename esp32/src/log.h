#pragma once
#include <Arduino.h>

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
void log(const String& message, LogLevel level = LogLevel::INFO);

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
