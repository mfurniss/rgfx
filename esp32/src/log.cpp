#include "log.h"
#include "serial.h"
#include "utils.h"
#include "network/mqtt.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

// Remote logging level: "off", "errors", or "all"
static String remoteLoggingLevel = "off";

// Thread-safe queue for log messages
// Messages are queued from any core and published from Core 0 (network task)
static QueueHandle_t logQueue = nullptr;
static const int LOG_QUEUE_SIZE = 32;
static const int MAX_LOG_MESSAGE_LENGTH = 256;

// Structure for queued log messages
struct LogMessage {
	char message[MAX_LOG_MESSAGE_LENGTH];
	LogLevel level;
};

void initLogQueue() {
	if (logQueue == nullptr) {
		logQueue = xQueueCreate(LOG_QUEUE_SIZE, sizeof(LogMessage));
		if (logQueue == nullptr) {
			Serial.println("[LOG] Failed to create log queue!");
		}
	}
}

void log(const char* message, LogLevel level) {
	log(String(message), level);
}

void log(const String& message, LogLevel level) {
	// Always log to serial
	SerialCommand::log(message);

	// Check if we should send to hub via MQTT
	if (remoteLoggingLevel == "off") {
		return;
	}

	// For "errors" mode, only send ERROR level messages
	if (remoteLoggingLevel == "errors" && level != LogLevel::ERROR) {
		return;
	}

	// Queue the message for publishing from Core 0
	if (logQueue != nullptr) {
		LogMessage logMsg;
		logMsg.level = level;

		// Safely copy message, truncating if necessary
		size_t len = message.length();
		if (len >= MAX_LOG_MESSAGE_LENGTH) {
			len = MAX_LOG_MESSAGE_LENGTH - 1;
		}
		memcpy(logMsg.message, message.c_str(), len);
		logMsg.message[len] = '\0';

		// Non-blocking queue send - drop message if queue is full
		// This prevents blocking the calling task if queue backs up
		if (xQueueSend(logQueue, &logMsg, 0) != pdTRUE) {
			// Queue full - message dropped (don't log this to avoid recursion)
		}
	}
}

void processLogQueue() {
	// Only process if MQTT is connected and queue exists
	if (logQueue == nullptr || !mqttClient.connected()) {
		return;
	}

	// Process up to 5 messages per call to avoid blocking too long
	LogMessage logMsg;
	int processed = 0;

	while (processed < 5 && xQueueReceive(logQueue, &logMsg, 0) == pdTRUE) {
		// Build log message JSON
		JsonDocument doc;
		doc["level"] = (logMsg.level == LogLevel::ERROR) ? "error" : "info";
		doc["message"] = logMsg.message;
		doc["timestamp"] = millis();

		String payload;
		serializeJson(doc, payload);

		// Publish to hub (QoS 0 - fire and forget)
		String topic = "rgfx/driver/" + Utils::getDeviceId() + "/log";
		mqttClient.publish(topic.c_str(), payload.c_str(), false, 0);

		processed++;
	}
}

void setRemoteLoggingLevel(const String& level) {
	if (level == "all" || level == "errors" || level == "off") {
		remoteLoggingLevel = level;
	}
}

String getRemoteLoggingLevel() {
	return remoteLoggingLevel;
}
