#include "log.h"
#include "serial.h"
#include "utils.h"
#include "network/mqtt.h"
#include <Arduino.h>
#include <ArduinoJson.h>

// Remote logging level: "off", "errors", or "all"
static String remoteLoggingLevel = "off";

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

	// Check if MQTT client is connected
	if (!mqttClient.connected()) {
		return;
	}

	// Build log message JSON
	JsonDocument doc;
	doc["level"] = (level == LogLevel::ERROR) ? "error" : "info";
	doc["message"] = message;
	doc["timestamp"] = millis();

	String payload;
	serializeJson(doc, payload);

	// Publish to hub (QoS 0 - fire and forget to avoid blocking)
	String topic = "rgfx/driver/" + Utils::getDeviceId() + "/log";
	mqttClient.publish(topic.c_str(), payload.c_str(), false, 0);
}

void setRemoteLoggingLevel(const String& level) {
	if (level == "all" || level == "errors" || level == "off") {
		remoteLoggingLevel = level;
	}
}

String getRemoteLoggingLevel() {
	return remoteLoggingLevel;
}
