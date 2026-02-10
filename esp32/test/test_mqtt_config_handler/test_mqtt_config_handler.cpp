/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for MQTT config handler (parseLEDDevice, applyGlobalSettings)
 *
 * Tests JSON parsing of LED device configurations received from Hub,
 * including strips, matrices, unified multi-panel displays, and global settings.
 *
 * Extracts testable logic from src/network/mqtt_config_handler.cpp.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <string>
#include <vector>
#include <cstdint>
#include <cstdio>
#include <algorithm>

#ifdef UNIT_TEST

using String = std::string;

// Stub log (no-op)
void log(const char*) {}
void log(const String&) {}

// Helper: startsWith for std::string
static bool startsWith(const String& str, const char* prefix) {
	return str.compare(0, strlen(prefix), prefix) == 0;
}

// min() template (normally from Arduino.h)
template <typename T>
T min(T a, T b) {
	return a < b ? a : b;
}

// --- LEDDeviceConfig struct (from driver_config.h) ---

struct LEDDeviceConfig {
	String id;
	uint8_t pin;
	String layout;
	uint16_t count;
	uint16_t offset;
	String chipset;
	String colorOrder;
	uint8_t maxBrightness;
	String colorCorrection;
	uint16_t width, height;
	uint16_t panelWidth, panelHeight;
	uint8_t unifiedRows, unifiedCols;
	std::vector<uint8_t> panelOrder;
	std::vector<uint8_t> panelRotation;
	bool reverse;
	String rgbwMode;

	LEDDeviceConfig()
		: pin(0), count(0), offset(0), maxBrightness(255),
		  width(0), height(0), panelWidth(0), panelHeight(0),
		  unifiedRows(1), unifiedCols(1), reverse(false), rgbwMode("exact") {}
};

struct DriverConfigData {
	String version;
	std::vector<LEDDeviceConfig> devices;
	uint8_t globalBrightnessLimit;
	bool dithering;
	uint8_t updateRate;
	uint8_t powerSupplyVolts;
	uint16_t maxPowerMilliamps;
	float gammaR, gammaG, gammaB;
	uint8_t floorR, floorG, floorB;

	DriverConfigData()
		: globalBrightnessLimit(255), dithering(true), updateRate(120),
		  powerSupplyVolts(5), maxPowerMilliamps(2000),
		  gammaR(1.0f), gammaG(1.0f), gammaB(1.0f),
		  floorR(0), floorG(0), floorB(0) {}
};

static DriverConfigData g_driverConfig;

// Stub: brightness setter (no-op)
static uint8_t lastBrightnessSet = 0;
static bool gammaLUTRebuilt = false;

namespace hal {
struct MockLedController {
	void setBrightness(uint8_t b) { lastBrightnessSet = b; }
};
static MockLedController mockController;
MockLedController& getLedController() { return mockController; }
}  // namespace hal

void rebuildGammaLUT() { gammaLUTRebuilt = true; }

// --- Extracted: parseLEDDevice (mirrors mqtt_config_handler.cpp) ---

static LEDDeviceConfig parseLEDDevice(JsonObject device) {
	LEDDeviceConfig devCfg;

	devCfg.id = device["id"] | "";
	devCfg.pin = device["pin"] | 0;
	devCfg.layout = device["layout"] | "strip";
	devCfg.count = device["count"] | 0;
	devCfg.offset = device["offset"] | 0;
	devCfg.chipset = device["chipset"] | "WS2812B";
	devCfg.colorOrder = device["color_order"] | "GRB";
	devCfg.maxBrightness = device["max_brightness"] | 255;
	devCfg.colorCorrection = device["color_correction"] | "TypicalLEDStrip";
	devCfg.rgbwMode = device["rgbw_mode"] | "exact";

	if (startsWith(devCfg.layout, "matrix-")) {
		devCfg.width = device["width"] | 0;
		devCfg.height = device["height"] | 0;

		bool unifiedValid = false;
		if (device["unified"].is<JsonArray>()) {
			JsonArray unified = device["unified"];

			if (unified.size() == 0) {
				// empty unified array
			} else if (!unified[0].is<JsonArray>() || unified[0].size() == 0) {
				// invalid first row
			} else {
				size_t expectedCols = unified[0].size();
				bool rowsValid = true;

				for (size_t rowIdx = 1; rowIdx < unified.size(); rowIdx++) {
					if (!unified[rowIdx].is<JsonArray>() || unified[rowIdx].size() != expectedCols) {
						rowsValid = false;
						break;
					}
				}

				if (rowsValid) {
					devCfg.panelWidth = device["panel_width"] | devCfg.width;
					devCfg.panelHeight = device["panel_height"] | devCfg.height;
					devCfg.unifiedRows = unified.size();
					devCfg.unifiedCols = expectedCols;

					devCfg.panelOrder.clear();
					devCfg.panelRotation.clear();
					for (JsonArray row : unified) {
						for (JsonVariant entry : row) {
							String str = entry.as<const char*>();
							int idx = 0;
							size_t i = 0;
							while (i < str.length() && str[i] >= '0' && str[i] <= '9') {
								idx = idx * 10 + (str[i] - '0');
								i++;
							}
							devCfg.panelOrder.push_back((uint8_t)idx);

							uint8_t rotation = 0;
							if (i < str.length()) {
								char rotChar = str[i];
								if (rotChar >= 'a' && rotChar <= 'd') {
									rotation = rotChar - 'a';
								}
							}
							devCfg.panelRotation.push_back(rotation);
						}
					}

					unifiedValid = true;
				}
			}
		}

		if (!unifiedValid) {
			devCfg.panelWidth = devCfg.width;
			devCfg.panelHeight = devCfg.height;
			devCfg.unifiedRows = 1;
			devCfg.unifiedCols = 1;
			devCfg.panelOrder.clear();
			devCfg.panelOrder.push_back(0);
			devCfg.panelRotation.clear();
			devCfg.panelRotation.push_back(0);
		}
	} else {
		devCfg.reverse = device["reverse"] | false;
	}

	return devCfg;
}

// --- Extracted: applyGlobalSettings (mirrors mqtt_config_handler.cpp) ---

static void applyGlobalSettings(JsonDocument& doc) {
	if (!doc["settings"].is<JsonObject>()) {
		return;
	}

	JsonObject settings = doc["settings"];
	uint32_t brightness = settings["global_brightness_limit"] | 255;
	g_driverConfig.globalBrightnessLimit = min(brightness, 255u);
	g_driverConfig.dithering = settings["dithering"] | true;
	g_driverConfig.updateRate = settings["update_rate"] | 60;
	g_driverConfig.powerSupplyVolts = settings["power_supply_volts"] | 5;
	g_driverConfig.maxPowerMilliamps = settings["max_power_milliamps"] | 2000;
	g_driverConfig.gammaR = settings["gamma_r"] | 1.0f;
	g_driverConfig.gammaG = settings["gamma_g"] | 1.0f;
	g_driverConfig.gammaB = settings["gamma_b"] | 1.0f;
	g_driverConfig.floorR = settings["floor_r"] | 0;
	g_driverConfig.floorG = settings["floor_g"] | 0;
	g_driverConfig.floorB = settings["floor_b"] | 0;

	hal::getLedController().setBrightness(g_driverConfig.globalBrightnessLimit);
	rebuildGammaLUT();
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	g_driverConfig = DriverConfigData();
	lastBrightnessSet = 0;
	gammaLUTRebuilt = false;
}

void tearDown(void) {}

// =============================================================================
// parseLEDDevice — Strip Tests
// =============================================================================

void test_parse_strip_device_with_all_fields() {
	JsonDocument doc;
	doc["id"] = "marquee";
	doc["pin"] = 5;
	doc["layout"] = "strip";
	doc["count"] = 120;
	doc["offset"] = 10;
	doc["chipset"] = "SK6812";
	doc["color_order"] = "RGB";
	doc["max_brightness"] = 200;
	doc["color_correction"] = "Typical8mmPixel";
	doc["rgbw_mode"] = "max_brightness";
	doc["reverse"] = true;

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_STRING("marquee", cfg.id.c_str());
	TEST_ASSERT_EQUAL_UINT8(5, cfg.pin);
	TEST_ASSERT_EQUAL_STRING("strip", cfg.layout.c_str());
	TEST_ASSERT_EQUAL_UINT16(120, cfg.count);
	TEST_ASSERT_EQUAL_UINT16(10, cfg.offset);
	TEST_ASSERT_EQUAL_STRING("SK6812", cfg.chipset.c_str());
	TEST_ASSERT_EQUAL_STRING("RGB", cfg.colorOrder.c_str());
	TEST_ASSERT_EQUAL_UINT8(200, cfg.maxBrightness);
	TEST_ASSERT_EQUAL_STRING("Typical8mmPixel", cfg.colorCorrection.c_str());
	TEST_ASSERT_EQUAL_STRING("max_brightness", cfg.rgbwMode.c_str());
	TEST_ASSERT_TRUE(cfg.reverse);
}

void test_parse_strip_device_defaults() {
	JsonDocument doc;
	doc["id"] = "strip1";

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_UINT8(0, cfg.pin);
	TEST_ASSERT_EQUAL_STRING("strip", cfg.layout.c_str());
	TEST_ASSERT_EQUAL_UINT16(0, cfg.count);
	TEST_ASSERT_EQUAL_UINT16(0, cfg.offset);
	TEST_ASSERT_EQUAL_STRING("WS2812B", cfg.chipset.c_str());
	TEST_ASSERT_EQUAL_STRING("GRB", cfg.colorOrder.c_str());
	TEST_ASSERT_EQUAL_UINT8(255, cfg.maxBrightness);
	TEST_ASSERT_EQUAL_STRING("TypicalLEDStrip", cfg.colorCorrection.c_str());
	TEST_ASSERT_EQUAL_STRING("exact", cfg.rgbwMode.c_str());
	TEST_ASSERT_FALSE(cfg.reverse);
}

void test_parse_strip_reverse_flag() {
	JsonDocument doc;
	doc["id"] = "strip1";
	doc["reverse"] = true;

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());
	TEST_ASSERT_TRUE(cfg.reverse);
}

// =============================================================================
// parseLEDDevice — Matrix Tests
// =============================================================================

void test_parse_matrix_device() {
	JsonDocument doc;
	doc["id"] = "panel1";
	doc["pin"] = 16;
	doc["layout"] = "matrix-tl-h-snake";
	doc["count"] = 256;
	doc["width"] = 16;
	doc["height"] = 16;

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_STRING("panel1", cfg.id.c_str());
	TEST_ASSERT_EQUAL_STRING("matrix-tl-h-snake", cfg.layout.c_str());
	TEST_ASSERT_EQUAL_UINT16(16, cfg.width);
	TEST_ASSERT_EQUAL_UINT16(16, cfg.height);
	TEST_ASSERT_EQUAL_UINT16(256, cfg.count);
}

void test_parse_matrix_single_panel_defaults() {
	JsonDocument doc;
	doc["id"] = "panel1";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 8;
	doc["height"] = 8;

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	// Single panel: unified defaults
	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedRows);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedCols);
	TEST_ASSERT_EQUAL_UINT16(8, cfg.panelWidth);
	TEST_ASSERT_EQUAL_UINT16(8, cfg.panelHeight);
	TEST_ASSERT_EQUAL(1, cfg.panelOrder.size());
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelOrder[0]);
	TEST_ASSERT_EQUAL(1, cfg.panelRotation.size());
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelRotation[0]);
}

// =============================================================================
// parseLEDDevice — Unified Panel Tests
// =============================================================================

void test_parse_unified_2x3_panel() {
	// 2 rows, 3 columns of 8x8 panels
	JsonDocument doc;
	doc["id"] = "big_display";
	doc["layout"] = "matrix-tl-h-snake";
	doc["count"] = 384;
	doc["width"] = 24;
	doc["height"] = 16;
	doc["panel_width"] = 8;
	doc["panel_height"] = 8;

	JsonArray unified = doc["unified"].to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0a");
	row0.add("1b");
	row0.add("2c");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("3d");
	row1.add("4a");
	row1.add("5b");

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_UINT8(2, cfg.unifiedRows);
	TEST_ASSERT_EQUAL_UINT8(3, cfg.unifiedCols);
	TEST_ASSERT_EQUAL_UINT16(8, cfg.panelWidth);
	TEST_ASSERT_EQUAL_UINT16(8, cfg.panelHeight);

	// Panel order: 0, 1, 2, 3, 4, 5
	TEST_ASSERT_EQUAL(6, cfg.panelOrder.size());
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.panelOrder[1]);
	TEST_ASSERT_EQUAL_UINT8(2, cfg.panelOrder[2]);
	TEST_ASSERT_EQUAL_UINT8(3, cfg.panelOrder[3]);
	TEST_ASSERT_EQUAL_UINT8(4, cfg.panelOrder[4]);
	TEST_ASSERT_EQUAL_UINT8(5, cfg.panelOrder[5]);

	// Rotations: a=0, b=1, c=2, d=3
	TEST_ASSERT_EQUAL(6, cfg.panelRotation.size());
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelRotation[0]);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.panelRotation[1]);
	TEST_ASSERT_EQUAL_UINT8(2, cfg.panelRotation[2]);
	TEST_ASSERT_EQUAL_UINT8(3, cfg.panelRotation[3]);
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelRotation[4]);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.panelRotation[5]);
}

void test_parse_unified_rotation_no_letter_defaults_to_zero() {
	JsonDocument doc;
	doc["id"] = "panel";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 16;
	doc["height"] = 8;
	doc["panel_width"] = 8;
	doc["panel_height"] = 8;

	JsonArray unified = doc["unified"].to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");  // No rotation letter
	row0.add("1");

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelRotation[0]);
	TEST_ASSERT_EQUAL_UINT8(0, cfg.panelRotation[1]);
}

void test_parse_unified_empty_array_falls_back_to_single() {
	JsonDocument doc;
	doc["id"] = "panel";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 8;
	doc["height"] = 8;
	doc["unified"].to<JsonArray>();  // Empty array

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedRows);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedCols);
}

void test_parse_unified_inconsistent_rows_falls_back_to_single() {
	JsonDocument doc;
	doc["id"] = "panel";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 16;
	doc["height"] = 16;

	JsonArray unified = doc["unified"].to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0a");
	row0.add("1a");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("2a");  // Only 1 column vs 2 in row0

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	// Should fall back to single panel
	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedRows);
	TEST_ASSERT_EQUAL_UINT8(1, cfg.unifiedCols);
}

void test_parse_unified_panel_width_defaults_to_matrix_width() {
	JsonDocument doc;
	doc["id"] = "panel";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 32;
	doc["height"] = 8;
	// No panel_width/panel_height specified

	JsonArray unified = doc["unified"].to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0a");
	row0.add("1a");

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	// panel_width defaults to width, panel_height defaults to height
	TEST_ASSERT_EQUAL_UINT16(32, cfg.panelWidth);
	TEST_ASSERT_EQUAL_UINT16(8, cfg.panelHeight);
}

void test_parse_unified_multi_digit_panel_index() {
	JsonDocument doc;
	doc["id"] = "panel";
	doc["layout"] = "matrix-tl-h-snake";
	doc["width"] = 80;
	doc["height"] = 8;
	doc["panel_width"] = 8;
	doc["panel_height"] = 8;

	JsonArray unified = doc["unified"].to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("10a");
	row0.add("11b");

	LEDDeviceConfig cfg = parseLEDDevice(doc.as<JsonObject>());

	TEST_ASSERT_EQUAL_UINT8(10, cfg.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(11, cfg.panelOrder[1]);
}

// =============================================================================
// applyGlobalSettings Tests
// =============================================================================

void test_apply_global_settings_full() {
	JsonDocument doc;
	JsonObject settings = doc["settings"].to<JsonObject>();
	settings["global_brightness_limit"] = 128;
	settings["dithering"] = false;
	settings["update_rate"] = 90;
	settings["power_supply_volts"] = 12;
	settings["max_power_milliamps"] = 5000;
	settings["gamma_r"] = 2.8f;
	settings["gamma_g"] = 2.6f;
	settings["gamma_b"] = 2.5f;
	settings["floor_r"] = 5;
	settings["floor_g"] = 3;
	settings["floor_b"] = 2;

	applyGlobalSettings(doc);

	TEST_ASSERT_EQUAL_UINT8(128, g_driverConfig.globalBrightnessLimit);
	TEST_ASSERT_FALSE(g_driverConfig.dithering);
	TEST_ASSERT_EQUAL_UINT8(90, g_driverConfig.updateRate);
	TEST_ASSERT_EQUAL_UINT8(12, g_driverConfig.powerSupplyVolts);
	TEST_ASSERT_EQUAL_UINT16(5000, g_driverConfig.maxPowerMilliamps);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 2.8f, g_driverConfig.gammaR);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 2.6f, g_driverConfig.gammaG);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 2.5f, g_driverConfig.gammaB);
	TEST_ASSERT_EQUAL_UINT8(5, g_driverConfig.floorR);
	TEST_ASSERT_EQUAL_UINT8(3, g_driverConfig.floorG);
	TEST_ASSERT_EQUAL_UINT8(2, g_driverConfig.floorB);
}

void test_apply_global_settings_defaults() {
	JsonDocument doc;
	doc["settings"].to<JsonObject>();  // Empty settings object

	applyGlobalSettings(doc);

	TEST_ASSERT_EQUAL_UINT8(255, g_driverConfig.globalBrightnessLimit);
	TEST_ASSERT_TRUE(g_driverConfig.dithering);
	TEST_ASSERT_EQUAL_UINT8(60, g_driverConfig.updateRate);
	TEST_ASSERT_EQUAL_UINT8(5, g_driverConfig.powerSupplyVolts);
	TEST_ASSERT_EQUAL_UINT16(2000, g_driverConfig.maxPowerMilliamps);
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 1.0f, g_driverConfig.gammaR);
}

void test_apply_global_settings_no_settings_key_is_noop() {
	JsonDocument doc;
	doc["version"] = "1.0";  // No "settings" key

	// Set a non-default value to verify it doesn't get changed
	g_driverConfig.globalBrightnessLimit = 42;

	applyGlobalSettings(doc);

	TEST_ASSERT_EQUAL_UINT8(42, g_driverConfig.globalBrightnessLimit);
}

void test_apply_global_settings_calls_set_brightness() {
	JsonDocument doc;
	JsonObject settings = doc["settings"].to<JsonObject>();
	settings["global_brightness_limit"] = 100;

	applyGlobalSettings(doc);

	TEST_ASSERT_EQUAL_UINT8(100, lastBrightnessSet);
}

void test_apply_global_settings_rebuilds_gamma_lut() {
	JsonDocument doc;
	doc["settings"].to<JsonObject>();

	TEST_ASSERT_FALSE(gammaLUTRebuilt);
	applyGlobalSettings(doc);
	TEST_ASSERT_TRUE(gammaLUTRebuilt);
}

void test_apply_global_settings_clamps_brightness_to_255() {
	JsonDocument doc;
	JsonObject settings = doc["settings"].to<JsonObject>();
	settings["global_brightness_limit"] = 300;  // Exceeds uint8_t range

	applyGlobalSettings(doc);

	TEST_ASSERT_EQUAL_UINT8(255, g_driverConfig.globalBrightnessLimit);
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Strip parsing
	RUN_TEST(test_parse_strip_device_with_all_fields);
	RUN_TEST(test_parse_strip_device_defaults);
	RUN_TEST(test_parse_strip_reverse_flag);

	// Matrix parsing
	RUN_TEST(test_parse_matrix_device);
	RUN_TEST(test_parse_matrix_single_panel_defaults);

	// Unified panel parsing
	RUN_TEST(test_parse_unified_2x3_panel);
	RUN_TEST(test_parse_unified_rotation_no_letter_defaults_to_zero);
	RUN_TEST(test_parse_unified_empty_array_falls_back_to_single);
	RUN_TEST(test_parse_unified_inconsistent_rows_falls_back_to_single);
	RUN_TEST(test_parse_unified_panel_width_defaults_to_matrix_width);
	RUN_TEST(test_parse_unified_multi_digit_panel_index);

	// Global settings
	RUN_TEST(test_apply_global_settings_full);
	RUN_TEST(test_apply_global_settings_defaults);
	RUN_TEST(test_apply_global_settings_no_settings_key_is_noop);
	RUN_TEST(test_apply_global_settings_calls_set_brightness);
	RUN_TEST(test_apply_global_settings_rebuilds_gamma_lut);
	RUN_TEST(test_apply_global_settings_clamps_brightness_to_255);

	return UNITY_END();
}

#endif  // UNIT_TEST
