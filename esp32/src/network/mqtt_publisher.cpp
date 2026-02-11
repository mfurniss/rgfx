#include "network/mqtt.h"
#include "telemetry.h"
#include "log.h"
#include "utils.h"
#include <ArduinoJson.h>

// Pre-allocated buffer for telemetry serialization (avoids heap fragmentation)
static char telemetryBuffer[1024];

// Pre-allocated buffer for effect error messages
static char effectErrorBuffer[512];

// Send driver telemetry message (initial connection and periodic heartbeat)
void sendDriverTelemetry() {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	// Get full system telemetry (including LED config)
	JsonDocument doc = Telemetry::getTelemetry();

	// Serialize to pre-allocated buffer (avoids String heap allocation)
	size_t len = serializeJson(doc, telemetryBuffer, sizeof(telemetryBuffer));

	// Publish to unified telemetry topic with QoS 0 (fire-and-forget)
	// QoS 0 is appropriate for periodic telemetry - missing one message is acceptable
	// since identical data is resent every 10 seconds
	bool result = mqttClient.publish("rgfx/system/driver/telemetry", telemetryBuffer, false, 0);

	if (result) {
		log("Driver telemetry sent (QoS 0)");
	} else {
		log("Failed to send driver telemetry");
		char errBuf[64];
		snprintf(errBuf, sizeof(errBuf), "Payload size: %u bytes, Error: %d", (unsigned)len, mqttClient.lastError());
		log(errBuf);
	}
}

// Publish test state change to Hub
void publishTestState(const String& state) {
	if (!mqttClient.connected()) {
		log("Can't publish test state - MQTT not connected");
		return;
	}

	// Build topic: rgfx/driver/{driver-id}/test/state
	String deviceId = Utils::getDeviceId();
	String topic = "rgfx/driver/" + deviceId + "/test/state";

	// Publish state with RETAIN flag and QoS 1 (at-least-once delivery)
	// QoS 1 is more reliable than QoS 2 for rapid publishes and sufficient for state sync
	// Retained messages ensure Hub receives state even if it subscribes late
	bool result = mqttClient.publish(topic.c_str(), state.c_str(), true, 1);

	if (result) {
		log("Published test state: " + state + " to " + topic);
	} else {
		log("Failed to publish test state");
	}
}

// Core implementation for publishing errors to Hub
static void publishErrorCore(const char* source, const char* errorMessage, JsonDocument* props) {
	if (!mqttClient.connected()) {
		return;  // Silently skip if not connected
	}

	String deviceId = Utils::getDeviceId();

	// Build JSON error message
	JsonDocument doc;
	doc["driverId"] = deviceId;
	doc["source"] = source;
	doc["error"] = errorMessage;

	if (props != nullptr) {
		doc["payload"] = *props;
	}

	size_t len = serializeJson(doc, effectErrorBuffer, sizeof(effectErrorBuffer));

	if (len >= sizeof(effectErrorBuffer)) {
		log("Error payload too large, truncated");
	}

	// Publish to system error topic with QoS 0 (fire-and-forget)
	bool result = mqttClient.publish("rgfx/system/driver/error", effectErrorBuffer, false, 0);

	if (result) {
		log("Published error: " + String(source) + " - " + String(errorMessage));
	}
}

// Publish error to Hub (with optional payload/props)
void publishError(const char* source, const char* errorMessage, JsonDocument& props) {
	publishErrorCore(source, errorMessage, &props);
}

// Publish error to Hub (simple version without payload)
void publishError(const char* source, const char* errorMessage) {
	publishErrorCore(source, errorMessage, nullptr);
}
