/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for ConfigNVS (Non-Volatile Storage) manager
 *
 * Tests validation logic, save/load round-trips, and error handling
 * for LED config, device ID, and logging level persistence.
 *
 * Mirrors src/config/config_nvs.cpp using mock Preferences for NVS simulation.
 */

#include <unity.h>
#include <string>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Mock Preferences (simulates ESP32 NVS in-memory)
#include "../mocks/mock_preferences.h"

// NVS keys and namespace (from config_nvs.h)
static constexpr const char* NAMESPACE = "rgfx";
static constexpr const char* KEY_LED_CONFIG = "led_config";
static constexpr const char* KEY_DEVICE_ID = "device_id";
static constexpr const char* KEY_LOG_LEVEL = "log_level";

// Static Preferences instance (mirrors config_nvs.cpp)
static Preferences prefs;

// --- ConfigNVS implementation (mirrors src/config/config_nvs.cpp) ---

namespace ConfigNVS {

void begin() {
	prefs.begin(NAMESPACE, false);
	prefs.end();
}

void factoryReset() {
	prefs.begin(NAMESPACE, false);
	prefs.clear();
	prefs.end();
}

bool saveLEDConfig(const String& configJson) {
	if (configJson.length() == 0) {
		return false;
	}

	prefs.begin(NAMESPACE, false);

	if (configJson.length() > 4000) {
		prefs.end();
		return false;
	}

	size_t bytesWritten = prefs.putString(KEY_LED_CONFIG, configJson);
	prefs.end();

	return bytesWritten > 0;
}

String loadLEDConfig() {
	prefs.begin(NAMESPACE, true);
	String config = prefs.getString(KEY_LED_CONFIG, "");
	prefs.end();
	return config;
}

bool hasLEDConfig() {
	prefs.begin(NAMESPACE, true);
	bool exists = prefs.isKey(KEY_LED_CONFIG);
	prefs.end();
	return exists;
}

void clearLEDConfig() {
	prefs.begin(NAMESPACE, false);
	prefs.remove(KEY_LED_CONFIG);
	prefs.end();
}

bool saveDeviceId(const String& deviceId) {
	if (deviceId.length() == 0) {
		return false;
	}

	if (deviceId.length() > 32) {
		return false;
	}

	prefs.begin(NAMESPACE, false);
	size_t bytesWritten = prefs.putString(KEY_DEVICE_ID, deviceId);
	prefs.end();

	return bytesWritten > 0;
}

String loadDeviceId() {
	prefs.begin(NAMESPACE, true);
	String deviceId = prefs.getString(KEY_DEVICE_ID, "");
	prefs.end();
	return deviceId;
}

bool hasDeviceId() {
	prefs.begin(NAMESPACE, true);
	bool exists = prefs.isKey(KEY_DEVICE_ID);
	prefs.end();
	return exists;
}

bool saveLoggingLevel(const String& level) {
	if (level != "all" && level != "errors" && level != "off") {
		return false;
	}

	prefs.begin(NAMESPACE, false);
	size_t bytesWritten = prefs.putString(KEY_LOG_LEVEL, level);
	prefs.end();

	return bytesWritten > 0;
}

String loadLoggingLevel() {
	prefs.begin(NAMESPACE, true);
	String level = prefs.getString(KEY_LOG_LEVEL, "off");
	prefs.end();
	return level;
}

}  // namespace ConfigNVS

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	// Reset NVS state before each test
	ConfigNVS::begin();
	ConfigNVS::factoryReset();
}

void tearDown(void) {}

// =============================================================================
// LED Config Tests
// =============================================================================

void test_save_and_load_led_config_round_trip() {
	String config = R"({"led_devices":[{"id":"strip1","pin":5,"count":60}]})";

	TEST_ASSERT_TRUE(ConfigNVS::saveLEDConfig(config));

	String loaded = ConfigNVS::loadLEDConfig();
	TEST_ASSERT_EQUAL_STRING(config.c_str(), loaded.c_str());
}

void test_save_led_config_rejects_empty_string() {
	TEST_ASSERT_FALSE(ConfigNVS::saveLEDConfig(""));
}

void test_save_led_config_rejects_oversized_config() {
	// Create a string > 4000 bytes
	String large(4001, 'x');
	TEST_ASSERT_FALSE(ConfigNVS::saveLEDConfig(large));
}

void test_save_led_config_accepts_max_size() {
	// 4000 bytes is the limit
	String maxSize(4000, 'x');
	TEST_ASSERT_TRUE(ConfigNVS::saveLEDConfig(maxSize));
}

void test_has_led_config_false_when_empty() {
	TEST_ASSERT_FALSE(ConfigNVS::hasLEDConfig());
}

void test_has_led_config_true_after_save() {
	ConfigNVS::saveLEDConfig(R"({"test":true})");
	TEST_ASSERT_TRUE(ConfigNVS::hasLEDConfig());
}

void test_clear_led_config_removes_saved_config() {
	ConfigNVS::saveLEDConfig(R"({"test":true})");
	TEST_ASSERT_TRUE(ConfigNVS::hasLEDConfig());

	ConfigNVS::clearLEDConfig();
	TEST_ASSERT_FALSE(ConfigNVS::hasLEDConfig());

	String loaded = ConfigNVS::loadLEDConfig();
	TEST_ASSERT_EQUAL_STRING("", loaded.c_str());
}

void test_load_led_config_returns_empty_when_not_saved() {
	String loaded = ConfigNVS::loadLEDConfig();
	TEST_ASSERT_EQUAL_STRING("", loaded.c_str());
}

// =============================================================================
// Device ID Tests
// =============================================================================

void test_save_and_load_device_id_round_trip() {
	TEST_ASSERT_TRUE(ConfigNVS::saveDeviceId("my-driver-01"));

	String loaded = ConfigNVS::loadDeviceId();
	TEST_ASSERT_EQUAL_STRING("my-driver-01", loaded.c_str());
}

void test_save_device_id_rejects_empty_string() {
	TEST_ASSERT_FALSE(ConfigNVS::saveDeviceId(""));
}

void test_save_device_id_rejects_too_long() {
	// 33 characters exceeds the 32-char limit
	String longId(33, 'a');
	TEST_ASSERT_FALSE(ConfigNVS::saveDeviceId(longId));
}

void test_save_device_id_accepts_max_length() {
	String maxId(32, 'a');
	TEST_ASSERT_TRUE(ConfigNVS::saveDeviceId(maxId));

	String loaded = ConfigNVS::loadDeviceId();
	TEST_ASSERT_EQUAL_STRING(maxId.c_str(), loaded.c_str());
}

void test_has_device_id_false_when_empty() {
	TEST_ASSERT_FALSE(ConfigNVS::hasDeviceId());
}

void test_has_device_id_true_after_save() {
	ConfigNVS::saveDeviceId("test-driver");
	TEST_ASSERT_TRUE(ConfigNVS::hasDeviceId());
}

void test_load_device_id_returns_empty_when_not_saved() {
	String loaded = ConfigNVS::loadDeviceId();
	TEST_ASSERT_EQUAL_STRING("", loaded.c_str());
}

// =============================================================================
// Logging Level Tests
// =============================================================================

void test_save_logging_level_accepts_all() {
	TEST_ASSERT_TRUE(ConfigNVS::saveLoggingLevel("all"));
	TEST_ASSERT_EQUAL_STRING("all", ConfigNVS::loadLoggingLevel().c_str());
}

void test_save_logging_level_accepts_errors() {
	TEST_ASSERT_TRUE(ConfigNVS::saveLoggingLevel("errors"));
	TEST_ASSERT_EQUAL_STRING("errors", ConfigNVS::loadLoggingLevel().c_str());
}

void test_save_logging_level_accepts_off() {
	TEST_ASSERT_TRUE(ConfigNVS::saveLoggingLevel("off"));
	TEST_ASSERT_EQUAL_STRING("off", ConfigNVS::loadLoggingLevel().c_str());
}

void test_save_logging_level_rejects_invalid_level() {
	TEST_ASSERT_FALSE(ConfigNVS::saveLoggingLevel("debug"));
	TEST_ASSERT_FALSE(ConfigNVS::saveLoggingLevel("verbose"));
	TEST_ASSERT_FALSE(ConfigNVS::saveLoggingLevel(""));
	TEST_ASSERT_FALSE(ConfigNVS::saveLoggingLevel("ALL"));
}

void test_load_logging_level_defaults_to_off() {
	String level = ConfigNVS::loadLoggingLevel();
	TEST_ASSERT_EQUAL_STRING("off", level.c_str());
}

// =============================================================================
// Factory Reset Tests
// =============================================================================

void test_factory_reset_clears_all_keys() {
	// Save data in all keys
	ConfigNVS::saveLEDConfig(R"({"test":true})");
	ConfigNVS::saveDeviceId("test-driver");
	ConfigNVS::saveLoggingLevel("all");

	// Verify all saved
	TEST_ASSERT_TRUE(ConfigNVS::hasLEDConfig());
	TEST_ASSERT_TRUE(ConfigNVS::hasDeviceId());

	// Factory reset
	ConfigNVS::factoryReset();

	// Verify all cleared
	TEST_ASSERT_FALSE(ConfigNVS::hasLEDConfig());
	TEST_ASSERT_FALSE(ConfigNVS::hasDeviceId());
	TEST_ASSERT_EQUAL_STRING("off", ConfigNVS::loadLoggingLevel().c_str());
}

void test_save_overwrites_previous_value() {
	ConfigNVS::saveDeviceId("first-id");
	ConfigNVS::saveDeviceId("second-id");

	String loaded = ConfigNVS::loadDeviceId();
	TEST_ASSERT_EQUAL_STRING("second-id", loaded.c_str());
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// LED Config
	RUN_TEST(test_save_and_load_led_config_round_trip);
	RUN_TEST(test_save_led_config_rejects_empty_string);
	RUN_TEST(test_save_led_config_rejects_oversized_config);
	RUN_TEST(test_save_led_config_accepts_max_size);
	RUN_TEST(test_has_led_config_false_when_empty);
	RUN_TEST(test_has_led_config_true_after_save);
	RUN_TEST(test_clear_led_config_removes_saved_config);
	RUN_TEST(test_load_led_config_returns_empty_when_not_saved);

	// Device ID
	RUN_TEST(test_save_and_load_device_id_round_trip);
	RUN_TEST(test_save_device_id_rejects_empty_string);
	RUN_TEST(test_save_device_id_rejects_too_long);
	RUN_TEST(test_save_device_id_accepts_max_length);
	RUN_TEST(test_has_device_id_false_when_empty);
	RUN_TEST(test_has_device_id_true_after_save);
	RUN_TEST(test_load_device_id_returns_empty_when_not_saved);

	// Logging Level
	RUN_TEST(test_save_logging_level_accepts_all);
	RUN_TEST(test_save_logging_level_accepts_errors);
	RUN_TEST(test_save_logging_level_accepts_off);
	RUN_TEST(test_save_logging_level_rejects_invalid_level);
	RUN_TEST(test_load_logging_level_defaults_to_off);

	// Factory Reset
	RUN_TEST(test_factory_reset_clears_all_keys);
	RUN_TEST(test_save_overwrites_previous_value);

	return UNITY_END();
}

#endif  // UNIT_TEST
