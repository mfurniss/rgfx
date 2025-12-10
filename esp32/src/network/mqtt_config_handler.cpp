#include "driver_config.h"
#include "config/config_leds.h"
#include "config/config_nvs.h"
#include "log.h"
#include "utils.h"
#include "oled/oled_display.h"
#include "network/mqtt.h"
#include <WiFi.h>
#include <ArduinoJson.h>

// Handle driver configuration received from Hub
void handleDriverConfig(const String& payload) {
	// Set flag immediately to prevent Core 1 from accessing matrix during config update
	// This protects against race conditions when config is received while effects are running
	g_configUpdateInProgress = true;

	log("Processing driver configuration...");

	// Parse JSON configuration
	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, payload);

	if (error) {
		log("ERROR: Failed to parse config JSON");
		log("Error: " + String(error.c_str()));
		g_configUpdateInProgress = false;
		return;
	}

	// Extract and update device ID if present
	if (doc["id"].is<String>()) {
		String newDeviceId = doc["id"].as<String>();

		if (newDeviceId.length() > 0) {
			String oldDeviceId = Utils::getDeviceId();

			// Check if ID is changing
			if (oldDeviceId != newDeviceId) {
				log("Setting device ID: " + newDeviceId);
				Utils::setDeviceId(newDeviceId);

				// Resubscribe to test topic with new ID
				extern MQTTClient mqttClient;
				if (mqttClient.connected()) {
					// Unsubscribe from old test topic if we had one
					if (oldDeviceId.length() > 0) {
						String oldTestTopic = "rgfx/driver/" + oldDeviceId + "/test";
						mqttClient.unsubscribe(oldTestTopic.c_str());
						log("Unsubscribed from old test topic: " + oldTestTopic);
					}

					// Subscribe to new test topic
					String newTestTopic = "rgfx/driver/" + newDeviceId + "/test";
					mqttClient.subscribe(newTestTopic.c_str(), 2);
					log("Subscribed to new test topic: " + newTestTopic);
				}

				// Update OLED display
				if (Display::isAvailable()) {
					Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(),
					                       mqttClient.connected(), newDeviceId);
				}
			}
		}
	}

	// Clear existing configuration
	g_driverConfig.devices.clear();

	// Extract basic info
	g_driverConfig.name = doc["name"] | "Unknown";
	g_driverConfig.description = doc["description"] | "";
	g_driverConfig.version = doc["version"] | "1.0";

	log("Config: " + g_driverConfig.name);
	if (g_driverConfig.description.length() > 0) {
		log("Description: " + g_driverConfig.description);
	}

	// Extract LED devices
	JsonArray ledDevices = doc["led_devices"];
	if (!ledDevices) {
		log("ERROR: No led_devices array in config");
		return;
	}

	int deviceCount = ledDevices.size();
	log("LED devices in config: " + String(deviceCount));

	// Process each LED device and add to global config
	for (JsonObject device : ledDevices) {
		LEDDeviceConfig devCfg;

		devCfg.id = device["id"] | "";
		devCfg.name = device["name"] | "";
		devCfg.pin = device["pin"] | 0;
		devCfg.layout = device["layout"] | "strip";
		devCfg.count = device["count"] | 0;
		devCfg.offset = device["offset"] | 0;
		devCfg.chipset = device["chipset"] | "WS2812B";
		devCfg.colorOrder = device["color_order"] | "GRB";
		devCfg.maxBrightness = device["max_brightness"] | 255;
		devCfg.colorCorrection = device["color_correction"] | "TypicalLEDStrip";

		// Matrix-specific fields
		if (devCfg.layout.startsWith("matrix-")) {
			devCfg.width = device["width"] | 0;
			devCfg.height = device["height"] | 0;

			// Parse unified panel configuration if present
			if (device["unified"].is<JsonArray>()) {
				JsonArray unified = device["unified"];
				devCfg.panelWidth = device["panel_width"] | devCfg.width;
				devCfg.panelHeight = device["panel_height"] | devCfg.height;
				devCfg.unifiedRows = unified.size();
				devCfg.unifiedCols = unified[0].size();

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

				log("Device: " + devCfg.name + " (" + devCfg.id + ")");
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
			} else {
				// Single panel (no unification)
				devCfg.panelWidth = devCfg.width;
				devCfg.panelHeight = devCfg.height;
				devCfg.unifiedRows = 1;
				devCfg.unifiedCols = 1;
				devCfg.panelOrder.clear();
				devCfg.panelOrder.push_back(0);
				devCfg.panelRotation.clear();
				devCfg.panelRotation.push_back(0);  // Default: no rotation

				log("Device: " + devCfg.name + " (" + devCfg.id + ")");
				log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
				log("  Matrix: " + String(devCfg.width) + "x" + String(devCfg.height));
				log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
			}
		} else {
			log("Device: " + devCfg.name + " (" + devCfg.id + ")");
			log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
			log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
		}
		log("  Chipset: " + devCfg.chipset + ", Color: " + devCfg.colorOrder);
		log("  Max Brightness: " + String(devCfg.maxBrightness));

		// Add to global config
		g_driverConfig.devices.push_back(devCfg);
	}

	// Extract global settings
	if (doc["settings"].is<JsonObject>()) {
		JsonObject settings = doc["settings"];
		uint32_t brightness = settings["global_brightness_limit"] | 255;
		g_driverConfig.globalBrightnessLimit = min(brightness, 255u);
		g_driverConfig.dithering = settings["dithering"] | true;
		g_driverConfig.updateRate = settings["update_rate"] | 60;
		g_driverConfig.powerSupplyVolts = settings["power_supply_volts"] | 5;
		g_driverConfig.maxPowerMilliamps = settings["max_power_milliamps"] | 2000;
		g_driverConfig.wifiTxPower = settings["wifi_tx_power"] | 19.5f;

		log("Global settings:");
		log("  Brightness limit: " + String(g_driverConfig.globalBrightnessLimit));
		log("  Dithering: " + String(g_driverConfig.dithering ? "enabled" : "disabled"));
		log("  Update rate: " + String(g_driverConfig.updateRate) + " Hz");
		log("  Power supply: " + String(g_driverConfig.powerSupplyVolts) + "V @ " +
		    String(g_driverConfig.maxPowerMilliamps) + "mA");
		log("  WiFi TX power: " + String(g_driverConfig.wifiTxPower, 1) + " dBm");
	}

	// Mark configuration as received
	g_configReceived = true;

	log("Driver configuration stored successfully");

	// Save configuration to NVS for persistence
	if (ConfigNVS::saveLEDConfig(payload)) {
		log("Configuration saved to NVS");
	} else {
		log("WARNING: Failed to save configuration to NVS");
	}

	// Apply LED configuration (FastLED init)
	// Matrix creation is done lazily in main loop when first needed
	log("Applying LED configuration...");
	if (configLEDs()) {
		log("LED configuration applied successfully!");
	} else {
		log("ERROR: Failed to apply LED configuration");
	}

	// Clear flag - config update complete
	g_configUpdateInProgress = false;
}
