#include "log.h"
#include "serial.h"
#include "utils.h"
#include "network/mqtt.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

// Remote logging level: "off", "errors", or "all"
static String remoteLoggingLevel = "off";

// Thread-safe queue for log messages
// Messages are queued from any core and published from Core 0 (network task)
static QueueHandle_t logQueue = nullptr;
static const int LOG_QUEUE_SIZE = 32;
static const int MAX_LOG_MESSAGE_LENGTH = 256;

// Mutex for MQTT client access in log publishing
// Prevents race condition between connection state check and publish
static SemaphoreHandle_t mqttLogMutex = nullptr;

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

	if (mqttLogMutex == nullptr) {
		mqttLogMutex = xSemaphoreCreateMutex();
		if (mqttLogMutex == nullptr) {
			Serial.println("[LOG] Failed to create MQTT log mutex!");
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
	// Only process if queue exists
	if (logQueue == nullptr || mqttLogMutex == nullptr) {
		return;
	}

	// Try to acquire mutex with short timeout (10ms)
	// This prevents blocking the network task if MQTT operations are slow
	if (xSemaphoreTake(mqttLogMutex, pdMS_TO_TICKS(10)) != pdTRUE) {
		return;  // Mutex busy, try again next iteration
	}

	// Check MQTT connection under mutex protection
	if (!mqttClient.connected()) {
		xSemaphoreGive(mqttLogMutex);
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

	xSemaphoreGive(mqttLogMutex);
}

void setRemoteLoggingLevel(const String& level) {
	if (level == "all" || level == "errors" || level == "off") {
		remoteLoggingLevel = level;
	}
}

String getRemoteLoggingLevel() {
	return remoteLoggingLevel;
}
