#pragma once

#ifdef ESP32
#include <Arduino.h>
#else
#include <string>
using String = std::string;
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
#ifdef ESP32
void log(const String& message, LogLevel level = LogLevel::INFO);
#endif

#ifdef ESP32
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
