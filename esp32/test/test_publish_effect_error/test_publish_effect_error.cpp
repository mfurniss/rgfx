/**
 * Unit Tests for publishEffectError function
 *
 * Tests the MQTT error reporting mechanism that sends effect validation
 * errors back to the Hub for display in the system error log.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <string>
#include <cstring>

// Standard library Arduino-like functions
using String = std::string;

// Mock MQTT client (UNIT_TEST already defined by platformio)
#include "../mocks/mock_mqtt.h"

// Create global mock MQTT client for testing
MQTTClient mqttClient(512);

// Mock Utils::getDeviceId()
namespace Utils {
String getDeviceId() {
	return "TEST_DEVICE_001";
}
}  // namespace Utils

// Pre-allocated buffer for effect error messages (same as mqtt.cpp)
static char effectErrorBuffer[512];

// Implementation of publishEffectError (extracted from mqtt.cpp for testing)
void publishEffectError(const char* effectName, const char* errorMessage, JsonDocument& props) {
	if (!mqttClient.connected()) {
		return;
	}

	String deviceId = Utils::getDeviceId();

	JsonDocument doc;
	doc["driverId"] = deviceId;
	doc["effect"] = effectName;
	doc["error"] = errorMessage;
	doc["payload"] = props;

	size_t len = serializeJson(doc, effectErrorBuffer, sizeof(effectErrorBuffer));
	(void)len;  // Suppress unused warning in test

	mqttClient.publish("rgfx/system/driver/error", effectErrorBuffer, false, 0);
}

void setUp(void) {
	mqttClient.clearPublishedMessages();
	mqttClient.connect("test_client");
}

void tearDown(void) {
	mqttClient.disconnect();
}

// =============================================================================
// Basic Functionality Tests
// =============================================================================

void test_publish_effect_error_sends_to_correct_topic() {
	JsonDocument props;
	props["color"] = "#FF0000";
	props["centerX"] = 50;

	publishEffectError("explode", "missing required prop", props);

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());
	TEST_ASSERT_EQUAL_STRING("rgfx/system/driver/error",
	                         mqttClient.publishedMessages[0].topic.c_str());
}

void test_publish_effect_error_includes_driver_id() {
	JsonDocument props;
	props["test"] = true;

	publishEffectError("pulse", "test error", props);

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());

	// Parse the published JSON
	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	TEST_ASSERT_EQUAL_STRING("TEST_DEVICE_001", published["driverId"].as<const char*>());
}

void test_publish_effect_error_includes_effect_name() {
	JsonDocument props;
	props["value"] = 123;

	publishEffectError("wipe", "invalid direction", props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	TEST_ASSERT_EQUAL_STRING("wipe", published["effect"].as<const char*>());
}

void test_publish_effect_error_includes_error_message() {
	JsonDocument props;

	publishEffectError("text", "missing 'color' prop", props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	TEST_ASSERT_EQUAL_STRING("missing 'color' prop", published["error"].as<const char*>());
}

void test_publish_effect_error_includes_payload() {
	JsonDocument props;
	props["centerX"] = "random";
	props["centerY"] = 50;
	props["color"] = "#00FF00";
	props["particleCount"] = 100;

	publishEffectError("explode", "centerX must be numeric", props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	// Verify payload is nested correctly
	TEST_ASSERT_EQUAL_STRING("random", published["payload"]["centerX"].as<const char*>());
	TEST_ASSERT_EQUAL(50, published["payload"]["centerY"].as<int>());
	TEST_ASSERT_EQUAL_STRING("#00FF00", published["payload"]["color"].as<const char*>());
	TEST_ASSERT_EQUAL(100, published["payload"]["particleCount"].as<int>());
}

// =============================================================================
// Edge Cases
// =============================================================================

void test_publish_effect_error_empty_props() {
	JsonDocument props;

	publishEffectError("bitmap", "missing centerX", props);

	TEST_ASSERT_EQUAL(1, mqttClient.publishedMessages.size());

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	// Payload should be an empty object or null
	TEST_ASSERT_TRUE(published["payload"].isNull() || published["payload"].size() == 0);
}

void test_publish_effect_error_long_error_message() {
	JsonDocument props;
	props["test"] = true;

	const char* longError =
	    "This is a very long error message that should still be included in the "
	    "published MQTT message without truncation as long as it fits in the buffer";

	publishEffectError("scroll_text", longError, props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	TEST_ASSERT_EQUAL_STRING(longError, published["error"].as<const char*>());
}

void test_publish_effect_error_special_characters_in_error() {
	JsonDocument props;
	props["value"] = "test";

	publishEffectError("text", "prop 'color' must be \"#RRGGBB\" format", props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	// JSON should properly escape special characters
	TEST_ASSERT_EQUAL_STRING("prop 'color' must be \"#RRGGBB\" format",
	                         published["error"].as<const char*>());
}

void test_publish_effect_error_nested_props() {
	JsonDocument props;
	props["color"] = "#FF0000";
	JsonArray gradient = props["gradient"].to<JsonArray>();
	gradient.add("#FF0000");
	gradient.add("#00FF00");
	gradient.add("#0000FF");
	props["gradientSpeed"] = 1.5;

	publishEffectError("text", "gradient parse error", props);

	JsonDocument published;
	deserializeJson(published, mqttClient.publishedMessages[0].payload);

	// Verify array structure is preserved
	TEST_ASSERT_EQUAL_STRING("#FF0000",
	                         published["payload"]["gradient"][0].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("#00FF00",
	                         published["payload"]["gradient"][1].as<const char*>());
	TEST_ASSERT_FLOAT_WITHIN(0.01, 1.5, published["payload"]["gradientSpeed"].as<float>());
}

// =============================================================================
// Connection State Tests
// =============================================================================

void test_publish_effect_error_not_connected_does_nothing() {
	mqttClient.disconnect();
	mqttClient.clearPublishedMessages();

	JsonDocument props;
	props["test"] = true;

	publishEffectError("pulse", "test error", props);

	// Should not publish when disconnected
	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages.size());
}

void test_publish_effect_error_qos_zero() {
	JsonDocument props;
	props["test"] = true;

	publishEffectError("wipe", "test", props);

	// Effect errors use QoS 0 (fire-and-forget)
	TEST_ASSERT_EQUAL(0, mqttClient.publishedMessages[0].qos);
}

void test_publish_effect_error_not_retained() {
	JsonDocument props;
	props["test"] = true;

	publishEffectError("projectile", "test", props);

	// Effect errors should not be retained
	TEST_ASSERT_FALSE(mqttClient.publishedMessages[0].retained);
}

// =============================================================================
// Multiple Errors Test
// =============================================================================

void test_publish_effect_error_multiple_calls() {
	JsonDocument props1;
	props1["centerX"] = "random";
	publishEffectError("explode", "error 1", props1);

	JsonDocument props2;
	props2["color"] = 123;  // Wrong type
	publishEffectError("pulse", "error 2", props2);

	JsonDocument props3;
	publishEffectError("wipe", "error 3", props3);

	TEST_ASSERT_EQUAL(3, mqttClient.publishedMessages.size());

	// Verify each error was published independently
	JsonDocument pub1, pub2, pub3;
	deserializeJson(pub1, mqttClient.publishedMessages[0].payload);
	deserializeJson(pub2, mqttClient.publishedMessages[1].payload);
	deserializeJson(pub3, mqttClient.publishedMessages[2].payload);

	TEST_ASSERT_EQUAL_STRING("explode", pub1["effect"].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("pulse", pub2["effect"].as<const char*>());
	TEST_ASSERT_EQUAL_STRING("wipe", pub3["effect"].as<const char*>());
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Basic Functionality
	RUN_TEST(test_publish_effect_error_sends_to_correct_topic);
	RUN_TEST(test_publish_effect_error_includes_driver_id);
	RUN_TEST(test_publish_effect_error_includes_effect_name);
	RUN_TEST(test_publish_effect_error_includes_error_message);
	RUN_TEST(test_publish_effect_error_includes_payload);

	// Edge Cases
	RUN_TEST(test_publish_effect_error_empty_props);
	RUN_TEST(test_publish_effect_error_long_error_message);
	RUN_TEST(test_publish_effect_error_special_characters_in_error);
	RUN_TEST(test_publish_effect_error_nested_props);

	// Connection State
	RUN_TEST(test_publish_effect_error_not_connected_does_nothing);
	RUN_TEST(test_publish_effect_error_qos_zero);
	RUN_TEST(test_publish_effect_error_not_retained);

	// Multiple Errors
	RUN_TEST(test_publish_effect_error_multiple_calls);

	return UNITY_END();
}
