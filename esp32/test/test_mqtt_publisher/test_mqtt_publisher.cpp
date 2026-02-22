/**
 * Unit tests for MQTT publisher functions
 *
 * Tests telemetry broadcasting, test state publishing, and error publishing.
 * Verifies topic format, QoS levels, retained flags, and JSON serialization.
 *
 * Complements test_publish_effect_error which tests publishEffectError specifically.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <string>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Mock MQTT client
#include "../mocks/mock_mqtt.h"

MQTTClient mqttClient(1024);

// Stub log
void log(const char*) {}
void log(const String&) {}

// Mock Utils::getDeviceId()
namespace Utils {
String getDeviceId() {
	return "TEST_DRIVER";
}
}  // namespace Utils

// Mock Telemetry::getTelemetry()
namespace Telemetry {
JsonDocument getTelemetry() {
	JsonDocument doc;
	doc["device_id"] = Utils::getDeviceId();
	doc["uptime"] = 12345;
	doc["free_heap"] = 50000;
	doc["wifi_rssi"] = -42;
	return doc;
}
}  // namespace Telemetry

// --- Extracted publisher functions (from mqtt_publisher.cpp) ---

static char telemetryBuffer[1024];
static char effectErrorBuffer[512];

void sendDriverTelemetry() {
	if (!mqttClient.connected()) {
		return;
	}

	JsonDocument doc = Telemetry::getTelemetry();
	size_t len = serializeJson(doc, telemetryBuffer, sizeof(telemetryBuffer));
	(void)len;

	mqttClient.publish("rgfx/system/driver/telemetry", telemetryBuffer, false, 0);
}

void publishTestState(const String& state) {
	if (!mqttClient.connected()) {
		return;
	}

	String deviceId = Utils::getDeviceId();
	String topic = "rgfx/driver/" + deviceId + "/test/state";
	mqttClient.publish(topic.c_str(), state.c_str(), true, 1);
}

static void publishErrorCore(const char* source, const char* errorMessage, JsonDocument* props) {
	if (!mqttClient.connected()) {
		return;
	}

	String deviceId = Utils::getDeviceId();

	JsonDocument doc;
	doc["driverId"] = deviceId;
	doc["source"] = source;
	doc["error"] = errorMessage;

	if (props != nullptr) {
		doc["payload"] = *props;
	}

	size_t len = serializeJson(doc, effectErrorBuffer, sizeof(effectErrorBuffer));
	(void)len;

	mqttClient.publish("rgfx/system/driver/error", effectErrorBuffer, false, 0);
}

void publishError(const char* source, const char* errorMessage, JsonDocument& props) {
	publishErrorCore(source, errorMessage, &props);
}

void publishError(const char* source, const char* errorMessage) {
	publishErrorCore(source, errorMessage, nullptr);
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	mqttClient.clearPublishedMessages();
	mqttClient.connect("test_client");
}

void tearDown(void) {
	mqttClient.disconnect();
}

// =============================================================================
// sendDriverTelemetry Tests
// =============================================================================

void test_telemetry_publishes_to_correct_topic() {
	sendDriverTelemetry();

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());
	TEST_ASSERT_EQUAL_STRING("rgfx/system/driver/telemetry",
	                         mqttClient.publishedMessages[0].topic.c_str());
}

void test_telemetry_uses_qos_zero() {
	sendDriverTelemetry();

	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages[0].qos);
}

void test_telemetry_not_retained() {
	sendDriverTelemetry();

	TEST_ASSERT_FALSE(mqttClient.publishedMessages[0].retained);
}

void test_telemetry_includes_device_id() {
	sendDriverTelemetry();

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);
	TEST_ASSERT_EQUAL_STRING("TEST_DRIVER", published["device_id"].as<const char*>());
}

void test_telemetry_skips_when_disconnected() {
	mqttClient.disconnect();
	mqttClient.clearPublishedMessages();

	sendDriverTelemetry();

	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages.size());
}

// =============================================================================
// publishTestState Tests
// =============================================================================

void test_publish_test_state_on() {
	publishTestState("on");

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());
	TEST_ASSERT_EQUAL_STRING("rgfx/driver/TEST_DRIVER/test/state",
	                         mqttClient.publishedMessages[0].topic.c_str());
	TEST_ASSERT_EQUAL_STRING("on", mqttClient.publishedMessages[0].payload.c_str());
}

void test_publish_test_state_off() {
	publishTestState("off");

	TEST_ASSERT_EQUAL_STRING("off", mqttClient.publishedMessages[0].payload.c_str());
}

void test_publish_test_state_retained() {
	publishTestState("on");

	TEST_ASSERT_TRUE(mqttClient.publishedMessages[0].retained);
}

void test_publish_test_state_qos_one() {
	publishTestState("on");

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages[0].qos);
}

void test_publish_test_state_skips_when_disconnected() {
	mqttClient.disconnect();
	mqttClient.clearPublishedMessages();

	publishTestState("on");

	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages.size());
}

// =============================================================================
// publishError Tests
// =============================================================================

void test_publish_error_with_props() {
	JsonDocument props;
	props["color"] = "#FF0000";
	props["centerX"] = 50;

	publishError("explode", "missing required prop", props);

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());
	TEST_ASSERT_EQUAL_STRING("rgfx/system/driver/error",
	                         mqttClient.publishedMessages[0].topic.c_str());

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);
	TEST_ASSERT_EQUAL_STRING("TEST_DRIVER", published["driverId"].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("explode", published["source"].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("missing required prop", published["error"].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("#FF0000", published["payload"]["color"].as<const char*>());
}

void test_publish_error_without_props() {
	publishError("config", "parse failed");

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);
	TEST_ASSERT_TRUE(published["payload"].isNull());
}

void test_publish_error_skips_when_disconnected() {
	mqttClient.disconnect();
	mqttClient.clearPublishedMessages();

	publishError("test", "error");

	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages.size());
}

void test_publish_error_uses_qos_zero() {
	publishError("test", "error");

	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages[0].qos);
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Telemetry
	RUN_TEST(test_telemetry_publishes_to_correct_topic);
	RUN_TEST(test_telemetry_uses_qos_zero);
	RUN_TEST(test_telemetry_not_retained);
	RUN_TEST(test_telemetry_includes_device_id);
	RUN_TEST(test_telemetry_skips_when_disconnected);

	// Test State
	RUN_TEST(test_publish_test_state_on);
	RUN_TEST(test_publish_test_state_off);
	RUN_TEST(test_publish_test_state_retained);
	RUN_TEST(test_publish_test_state_qos_one);
	RUN_TEST(test_publish_test_state_skips_when_disconnected);

	// Error Publishing
	RUN_TEST(test_publish_error_with_props);
	RUN_TEST(test_publish_error_without_props);
	RUN_TEST(test_publish_error_skips_when_disconnected);
	RUN_TEST(test_publish_error_uses_qos_zero);

	return UNITY_END();
}

#endif  // UNIT_TEST
