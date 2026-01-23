#include "driver_config.h"
#include "config/config_leds.h"
#include "config/config_nvs.h"
#include "graphics/downsample_to_matrix.h"
#include "hal/led_controller.h"
#include "log.h"
#include "utils.h"
#include "network/mqtt.h"
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

/**
 * Update device ID and related services (mDNS, OTA, display)
 */
static void applyDeviceId(JsonDocument& doc) {
	if (!doc["id"].is<String>()) {
		return;
	}

	String newDeviceId = doc["id"].as<String>();
	if (newDeviceId.length() == 0) {
		return;
	}

	String oldDeviceId = Utils::getDeviceId();
	if (oldDeviceId == newDeviceId) {
		return;
	}

	log("Setting device ID: " + newDeviceId);
	Utils::setDeviceId(newDeviceId);

	// Update mDNS hostname
	MDNS.end();
	if (MDNS.begin(newDeviceId.c_str())) {
		log("mDNS hostname updated to: " + newDeviceId);
	} else {
		log("ERROR: Failed to update mDNS hostname");
	}

	// Update OTA hostname
	ArduinoOTA.setHostname(newDeviceId.c_str());
}

/**
 * Parse a single LED device from JSON into LEDDeviceConfig
 */
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

	// Matrix-specific fields
	if (devCfg.layout.startsWith("matrix-")) {
		devCfg.width = device["width"] | 0;
		devCfg.height = device["height"] | 0;

		// Parse unified panel configuration if present
		bool unifiedValid = false;
		if (device["unified"].is<JsonArray>()) {
			JsonArray unified = device["unified"];

			// Validate unified array structure
			if (unified.size() == 0) {
				log("ERROR: Device " + devCfg.id + " has empty unified array, using single panel");
			} else if (!unified[0].is<JsonArray>() || unified[0].size() == 0) {
				log("ERROR: Device " + devCfg.id + " unified[0] is not a valid array, using single panel");
			} else {
				size_t expectedCols = unified[0].size();
				bool rowsValid = true;

				// Validate all rows have the same column count
				for (size_t rowIdx = 1; rowIdx < unified.size(); rowIdx++) {
					if (!unified[rowIdx].is<JsonArray>() || unified[rowIdx].size() != expectedCols) {
						log("ERROR: Device " + devCfg.id + " unified row " + String(rowIdx) +
						    " has inconsistent column count (expected " + String(expectedCols) +
						    ", got " + String(unified[rowIdx].size()) + "), using single panel");
						rowsValid = false;
						break;
					}
				}

				if (rowsValid) {
					devCfg.panelWidth = device["panel_width"] | devCfg.width;
					devCfg.panelHeight = device["panel_height"] | devCfg.height;
					devCfg.unifiedRows = unified.size();
					devCfg.unifiedCols = expectedCols;

					// Flatten the 2D array to panelOrder and panelRotation vectors (row-major)
					// Format: "<index><rotation>" where rotation is optional a/b/c/d
					devCfg.panelOrder.clear();
					devCfg.panelRotation.clear();
					for (JsonArray row : unified) {
						for (JsonVariant entry : row) {
							String str = entry.as<String>();
							// Extract numeric index (all digits at start)
							int idx = 0;
							size_t i = 0;
							while (i < str.length() && str[i] >= '0' && str[i] <= '9') {
								idx = idx * 10 + (str[i] - '0');
								i++;
							}
							devCfg.panelOrder.push_back((uint8_t)idx);

							// Extract rotation (optional letter at end: a=0, b=1, c=2, d=3)
							uint8_t rotation = 0;  // Default: 0° (same as 'a')
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

					log("Device: " + devCfg.id);
					log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
					log("  Unified: " + String(devCfg.unifiedCols) + "x" + String(devCfg.unifiedRows) +
					    " panels of " + String(devCfg.panelWidth) + "x" + String(devCfg.panelHeight));
					log("  Total: " + String(devCfg.width) + "x" + String(devCfg.height) +
					    " (" + String(devCfg.count) + " LEDs)");
					// Log parsed panel order and rotations for debugging
					String orderStr = "  PanelOrder: [";
					String rotStr = "  PanelRotation: [";
					for (size_t i = 0; i < devCfg.panelOrder.size(); i++) {
						if (i > 0) { orderStr += ", "; rotStr += ", "; }
						orderStr += String(devCfg.panelOrder[i]);
						rotStr += String(devCfg.panelRotation[i]);
					}
					orderStr += "]";
					rotStr += "]";
					log(orderStr);
					log(rotStr);
				}
			}
		}

		if (!unifiedValid) {
			// Single panel (no unification or validation failed)
			devCfg.panelWidth = devCfg.width;
			devCfg.panelHeight = devCfg.height;
			devCfg.unifiedRows = 1;
			devCfg.unifiedCols = 1;
			devCfg.panelOrder.clear();
			devCfg.panelOrder.push_back(0);
			devCfg.panelRotation.clear();
			devCfg.panelRotation.push_back(0);  // Default: no rotation

			log("Device: " + devCfg.id);
			log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
			log("  Matrix: " + String(devCfg.width) + "x" + String(devCfg.height));
			log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
		}
	} else {
		// Strip-specific: parse reverse flag
		devCfg.reverse = device["reverse"] | false;

		log("Device: " + devCfg.id);
		log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
		log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
		if (devCfg.reverse) {
			log("  Reverse: enabled");
		}
	}
	log("  Chipset: " + devCfg.chipset + ", Color: " + devCfg.colorOrder);
	log("  Max Brightness: " + String(devCfg.maxBrightness));

	return devCfg;
}

/**
 * Apply global settings from JSON config
 */
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

	log("Global settings:");
	log("  Brightness limit: " + String(g_driverConfig.globalBrightnessLimit));
	log("  Dithering: " + String(g_driverConfig.dithering ? "enabled" : "disabled"));
	log("  Update rate: " + String(g_driverConfig.updateRate) + " Hz");
	log("  Power supply: " + String(g_driverConfig.powerSupplyVolts) + "V @ " +
	    String(g_driverConfig.maxPowerMilliamps) + "mA");
	log("  Gamma: R=" + String(g_driverConfig.gammaR, 2) +
	    " G=" + String(g_driverConfig.gammaG, 2) +
	    " B=" + String(g_driverConfig.gammaB, 2));
	log("  Floor: R=" + String(g_driverConfig.floorR) +
	    " G=" + String(g_driverConfig.floorG) +
	    " B=" + String(g_driverConfig.floorB));

	// Apply brightness immediately
	hal::getLedController().setBrightness(g_driverConfig.globalBrightnessLimit);

	// Rebuild gamma lookup tables from new values
	rebuildGammaLUT();
}

// Handle driver configuration received from Hub
void handleDriverConfig(const String& payload) {
	// Set flag immediately to prevent Core 1 from accessing matrix during config update
	g_configUpdateInProgress = true;

	// Log stack high-water mark (helps diagnose stack overflow crashes)
	UBaseType_t stackRemaining = uxTaskGetStackHighWaterMark(NULL);
	log("Processing driver configuration... (stack: " + String(stackRemaining) + " bytes free)");

	// Parse JSON configuration
	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, payload);
	if (error) {
		log("ERROR: Failed to parse config JSON: " + String(error.c_str()));
		g_configUpdateInProgress = false;
		return;
	}

	// Update device ID and related services
	applyDeviceId(doc);

	// Clear existing configuration and extract basic info
	g_driverConfig.devices.clear();
	g_driverConfig.version = doc["version"] | "1.0";

	log("Config version: " + g_driverConfig.version);

	// Extract LED devices
	JsonArray ledDevices = doc["led_devices"];
	if (!ledDevices) {
		log("ERROR: No led_devices array in config");
		g_configUpdateInProgress = false;
		return;
	}

	log("LED devices in config: " + String(ledDevices.size()));

	// Parse each LED device and add to global config
	for (JsonObject device : ledDevices) {
		LEDDeviceConfig devCfg = parseLEDDevice(device);
		g_driverConfig.devices.push_back(devCfg);
	}

	// Apply global settings (brightness, gamma, power limits, etc.)
	applyGlobalSettings(doc);

	// Mark configuration as received
	g_configReceived = true;
	log("Driver configuration stored successfully");

	// Apply LED configuration (FastLED init) BEFORE saving to NVS
	// This ensures we don't persist a config that fails to apply
	log("Applying LED configuration...");
	if (!configLEDs()) {
		log("ERROR: Failed to apply LED configuration - not saving to NVS");
		g_configUpdateInProgress = false;
		return;
	}
	log("LED configuration applied successfully!");

	// Save configuration to NVS only after successful application
	if (ConfigNVS::saveLEDConfig(payload)) {
		log("Configuration saved to NVS");

		// Publish confirmation so Hub knows config is safely persisted
		String macAddress = WiFi.macAddress();
		String confirmTopic = "rgfx/driver/" + macAddress + "/config/saved";
		mqttClient.publish(confirmTopic.c_str(), "ok", false, 2);
		mqttClient.loop();
		log("Published config saved confirmation to " + confirmTopic);
	} else {
		log("WARNING: Failed to save configuration to NVS (config still active for this session)");
	}

	g_configUpdateInProgress = false;
}
