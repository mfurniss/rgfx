/**
 * Unit tests for MQTT callback and deferred operation processing
 *
 * Tests that mqttCallback() correctly routes messages by topic and queues
 * deferred operations, and that processPendingMqttOperations() executes
 * them outside the callback context (preventing arduino-mqtt reentrancy bugs).
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <string>
#include <atomic>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Stubs
enum class LogLevel { INFO, ERROR };
void log(const char*, LogLevel = LogLevel::INFO) {}
void log(const String&, LogLevel = LogLevel::INFO) {}

// Mock MQTT client
#include "../mocks/mock_mqtt.h"
MQTTClient mqttClient(512);

// Global state (from mqtt.cpp)
uint32_t mqttMessagesReceived = 0;
std::atomic<bool> testModeActive(false);
std::atomic<bool> mqttEventReceived(false);
static constexpr unsigned long MQTT_PUBLISH_BEFORE_REBOOT_DELAY_MS = 200;

// Tracking stubs for commands and dependencies
static bool resetCalled = false;
static bool rebootCalled = false;
static bool clearEffectsCalled = false;
static String lastHandledConfig;
static String lastTestStatePublished;
static String lastLoggingLevel;
static bool loggingLevelSaved = false;
static String lastWifiSsid;
static String lastWifiPassword;
static bool wifiCredentialsSet = false;
static bool safeRestartCalled = false;

// Mock EffectProcessor
struct MockEffectProcessor {
	void clearEffects() { clearEffectsCalled = true; }
};
static MockEffectProcessor mockProcessor;
MockEffectProcessor* effectProcessor = &mockProcessor;

// Stubs
namespace Commands {
void reset(const String&) { resetCalled = true; }
void reboot(const String&) { rebootCalled = true; }
}  // namespace Commands

void handleDriverConfig(const String& payload) { lastHandledConfig = payload; }
void publishTestState(const String& state) { lastTestStatePublished = state; }
void setRemoteLoggingLevel(const String& level) { lastLoggingLevel = level; }
void delay(unsigned long) {}

namespace ConfigNVS {
bool saveLoggingLevel(const String& level) {
	loggingLevelSaved = true;
	(void)level;
	return true;
}
}  // namespace ConfigNVS

namespace ConfigPortal {
bool setWiFiCredentials(const String& ssid, const String& password) {
	lastWifiSsid = ssid;
	lastWifiPassword = password;
	wifiCredentialsSet = true;
	return true;
}
}  // namespace ConfigPortal

namespace Utils {
String getDeviceId() { return "TEST_DRIVER"; }
}  // namespace Utils

void safeRestart() { safeRestartCalled = true; }

// String helpers for topic matching
static bool startsWith(const String& str, const char* prefix) {
	return str.compare(0, strlen(prefix), prefix) == 0;
}
static bool endsWith(const String& str, const char* suffix) {
	size_t suffixLen = strlen(suffix);
	if (str.length() < suffixLen) return false;
	return str.compare(str.length() - suffixLen, suffixLen, suffix) == 0;
}

// --- Extracted: Pending operation state and functions ---

static String pendingConfig;
static bool hasPendingConfig = false;
static bool pendingTestModeChange = false;
static bool pendingTestModeValue = false;
static bool pendingLoggingConfig = false;
static String pendingLoggingPayload;
static bool pendingWifiConfig = false;
static String pendingWifiSsid;
static String pendingWifiPassword;

void mqttCallback(String& topic, String& payload) {
	mqttMessagesReceived++;
	mqttEventReceived = true;

	if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/config")) {
		pendingConfig = payload;
		hasPendingConfig = true;
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/test")) {
		if (payload == "on") {
			pendingTestModeChange = true;
			pendingTestModeValue = true;
		} else if (payload == "off") {
			pendingTestModeChange = true;
			pendingTestModeValue = false;
		}
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/reset")) {
		Commands::reset("");
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/reboot")) {
		Commands::reboot("");
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/clear-effects")) {
		if (effectProcessor != nullptr) {
			effectProcessor->clearEffects();
		}
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/logging")) {
		pendingLoggingConfig = true;
		pendingLoggingPayload = payload;
	} else if (startsWith(topic, "rgfx/driver/") && endsWith(topic, "/wifi")) {
		JsonDocument doc;
		DeserializationError error = deserializeJson(doc, payload);
		if (error) return;
		if (!doc["ssid"].is<const char*>()) return;

		pendingWifiSsid = doc["ssid"].as<String>();
		pendingWifiPassword = doc["password"].as<String>();
		pendingWifiConfig = true;
	}
}

void processPendingMqttOperations() {
	if (hasPendingConfig) {
		hasPendingConfig = false;
		String config = pendingConfig;
		pendingConfig = "";
		handleDriverConfig(config);
	}

	if (pendingTestModeChange) {
		pendingTestModeChange = false;
		bool newState = pendingTestModeValue;

		if (newState) {
			testModeActive = true;
			publishTestState("on");
		} else {
			testModeActive = false;
			if (effectProcessor != nullptr) {
				effectProcessor->clearEffects();
			}
			publishTestState("off");
		}
	}

	if (pendingLoggingConfig) {
		pendingLoggingConfig = false;
		String payload = pendingLoggingPayload;
		pendingLoggingPayload = "";

		JsonDocument doc;
		DeserializationError error = deserializeJson(doc, payload);
		if (error) return;

		const char* level = doc["level"];
		if (level) {
			String levelStr = String(level);
			setRemoteLoggingLevel(levelStr);
			ConfigNVS::saveLoggingLevel(levelStr);
		}
	}

	if (pendingWifiConfig) {
		pendingWifiConfig = false;
		String ssid = pendingWifiSsid;
		String password = pendingWifiPassword;
		pendingWifiSsid = "";
		pendingWifiPassword = "";

		if (ConfigPortal::setWiFiCredentials(ssid, password)) {
			String deviceId = Utils::getDeviceId();
			String responseTopic = "rgfx/driver/" + deviceId + "/wifi/response";
			mqttClient.publish(responseTopic.c_str(), R"({"success":true})", false, 2);
			mqttClient.loop();
			delay(MQTT_PUBLISH_BEFORE_REBOOT_DELAY_MS);
			safeRestart();
		}
	}
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	mqttMessagesReceived = 0;
	mqttEventReceived = false;
	testModeActive = false;
	resetCalled = false;
	rebootCalled = false;
	clearEffectsCalled = false;
	lastHandledConfig = "";
	lastTestStatePublished = "";
	lastLoggingLevel = "";
	loggingLevelSaved = false;
	lastWifiSsid = "";
	lastWifiPassword = "";
	wifiCredentialsSet = false;
	safeRestartCalled = false;
	hasPendingConfig = false;
	pendingTestModeChange = false;
	pendingLoggingConfig = false;
	pendingWifiConfig = false;
	pendingConfig = "";
	pendingLoggingPayload = "";
	pendingWifiSsid = "";
	pendingWifiPassword = "";
	mqttClient.clearPublishedMessages();
	mqttClient.connect("test");
}

void tearDown(void) {}

// Helper: send a callback message
static void sendMessage(const char* topic, const char* payload) {
	String t(topic);
	String p(payload);
	mqttCallback(t, p);
}

// =============================================================================
// mqttCallback — Topic Routing Tests
// =============================================================================

void test_callback_queues_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/config", R"({"version":"1.0"})");

	TEST_ASSERT_TRUE(hasPendingConfig);
	TEST_ASSERT_EQUAL_STRING(R"({"version":"1.0"})", pendingConfig.c_str());
}

void test_callback_queues_test_mode_on() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "on");

	TEST_ASSERT_TRUE(pendingTestModeChange);
	TEST_ASSERT_TRUE(pendingTestModeValue);
}

void test_callback_queues_test_mode_off() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "off");

	TEST_ASSERT_TRUE(pendingTestModeChange);
	TEST_ASSERT_FALSE(pendingTestModeValue);
}

void test_callback_reset_executes_immediately() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/reset", "");

	TEST_ASSERT_TRUE(resetCalled);
}

void test_callback_reboot_executes_immediately() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/reboot", "");

	TEST_ASSERT_TRUE(rebootCalled);
}

void test_callback_clear_effects_executes_immediately() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/clear-effects", "");

	TEST_ASSERT_TRUE(clearEffectsCalled);
}

void test_callback_queues_logging_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/logging", R"({"level":"errors"})");

	TEST_ASSERT_TRUE(pendingLoggingConfig);
	TEST_ASSERT_EQUAL_STRING(R"({"level":"errors"})", pendingLoggingPayload.c_str());
}

void test_callback_queues_wifi_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/wifi",
	            R"({"ssid":"MyNetwork","password":"secret123"})");

	TEST_ASSERT_TRUE(pendingWifiConfig);
	TEST_ASSERT_EQUAL_STRING("MyNetwork", pendingWifiSsid.c_str());
	TEST_ASSERT_EQUAL_STRING("secret123", pendingWifiPassword.c_str());
}

void test_callback_wifi_rejects_invalid_json() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/wifi", "not json");

	TEST_ASSERT_FALSE(pendingWifiConfig);
}

void test_callback_wifi_rejects_missing_ssid() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/wifi", R"({"password":"secret"})");

	TEST_ASSERT_FALSE(pendingWifiConfig);
}

void test_callback_increments_message_counter() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/config", "{}");
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "on");
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/reboot", "");

	TEST_ASSERT_EQUAL_UINT32(3, mqttMessagesReceived);
}

void test_callback_sets_event_received_flag() {
	TEST_ASSERT_FALSE(mqttEventReceived.load());

	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "on");

	TEST_ASSERT_TRUE(mqttEventReceived.load());
}

// =============================================================================
// processPendingMqttOperations — Deferred Processing Tests
// =============================================================================

void test_process_pending_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/config", R"({"led_devices":[]})");

	processPendingMqttOperations();

	TEST_ASSERT_EQUAL_STRING(R"({"led_devices":[]})", lastHandledConfig.c_str());
	TEST_ASSERT_FALSE(hasPendingConfig);  // Flag cleared
}

void test_process_test_mode_on() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "on");

	processPendingMqttOperations();

	TEST_ASSERT_TRUE(testModeActive.load());
	TEST_ASSERT_EQUAL_STRING("on", lastTestStatePublished.c_str());
}

void test_process_test_mode_off_clears_effects() {
	testModeActive = true;
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/test", "off");

	processPendingMqttOperations();

	TEST_ASSERT_FALSE(testModeActive.load());
	TEST_ASSERT_TRUE(clearEffectsCalled);
	TEST_ASSERT_EQUAL_STRING("off", lastTestStatePublished.c_str());
}

void test_process_logging_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/logging", R"({"level":"all"})");

	processPendingMqttOperations();

	TEST_ASSERT_EQUAL_STRING("all", lastLoggingLevel.c_str());
	TEST_ASSERT_TRUE(loggingLevelSaved);
}

void test_process_logging_invalid_json_no_crash() {
	pendingLoggingConfig = true;
	pendingLoggingPayload = "not json";

	processPendingMqttOperations();

	TEST_ASSERT_EQUAL_STRING("", lastLoggingLevel.c_str());
}

void test_process_wifi_config() {
	sendMessage("rgfx/driver/AA:BB:CC:DD:EE:FF/wifi",
	            R"({"ssid":"TestNet","password":"pass123"})");

	processPendingMqttOperations();

	TEST_ASSERT_TRUE(wifiCredentialsSet);
	TEST_ASSERT_EQUAL_STRING("TestNet", lastWifiSsid.c_str());
	TEST_ASSERT_EQUAL_STRING("pass123", lastWifiPassword.c_str());
	TEST_ASSERT_TRUE(safeRestartCalled);
}

void test_process_no_pending_ops_is_noop() {
	processPendingMqttOperations();

	TEST_ASSERT_EQUAL_STRING("", lastHandledConfig.c_str());
	TEST_ASSERT_EQUAL_STRING("", lastTestStatePublished.c_str());
	TEST_ASSERT_FALSE(resetCalled);
	TEST_ASSERT_FALSE(rebootCalled);
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Callback routing
	RUN_TEST(test_callback_queues_config);
	RUN_TEST(test_callback_queues_test_mode_on);
	RUN_TEST(test_callback_queues_test_mode_off);
	RUN_TEST(test_callback_reset_executes_immediately);
	RUN_TEST(test_callback_reboot_executes_immediately);
	RUN_TEST(test_callback_clear_effects_executes_immediately);
	RUN_TEST(test_callback_queues_logging_config);
	RUN_TEST(test_callback_queues_wifi_config);
	RUN_TEST(test_callback_wifi_rejects_invalid_json);
	RUN_TEST(test_callback_wifi_rejects_missing_ssid);
	RUN_TEST(test_callback_increments_message_counter);
	RUN_TEST(test_callback_sets_event_received_flag);

	// Deferred processing
	RUN_TEST(test_process_pending_config);
	RUN_TEST(test_process_test_mode_on);
	RUN_TEST(test_process_test_mode_off_clears_effects);
	RUN_TEST(test_process_logging_config);
	RUN_TEST(test_process_logging_invalid_json_no_crash);
	RUN_TEST(test_process_wifi_config);
	RUN_TEST(test_process_no_pending_ops_is_noop);

	return UNITY_END();
}

#endif  // UNIT_TEST
