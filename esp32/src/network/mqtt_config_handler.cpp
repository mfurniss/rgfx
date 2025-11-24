#include "driver_config.h"
#include "config/config_leds.h"
#include "config/config_nvs.h"
#include "log.h"
#include "matrix.h"
#include "effects/effect_processor.h"
#include "utils.h"
#include "oled/oled_display.h"
#include "network/mqtt.h"
#include <WiFi.h>
#include <ArduinoJson.h>

// External matrix pointer used by game loop
extern Matrix* matrix;

// Handle driver configuration received from Hub
void handleDriverConfig(const String& payload) {
	log("Processing driver configuration...");

	// Parse JSON configuration
	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, payload);

	if (error) {
		log("ERROR: Failed to parse config JSON");
		log("Error: " + String(error.c_str()));
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

			log("Device: " + devCfg.name + " (" + devCfg.id + ")");
			log("  Pin: GPIO" + String(devCfg.pin) + ", Layout: " + devCfg.layout);
			log("  Matrix: " + String(devCfg.width) + "x" + String(devCfg.height));
			log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
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

		log("Global settings:");
		log("  Brightness limit: " + String(g_driverConfig.globalBrightnessLimit));
		log("  Dithering: " + String(g_driverConfig.dithering ? "enabled" : "disabled"));
		log("  Update rate: " + String(g_driverConfig.updateRate) + " Hz");
		log("  Power supply: " + String(g_driverConfig.powerSupplyVolts) + "V @ " +
		    String(g_driverConfig.maxPowerMilliamps) + "mA");
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

	// Apply configuration immediately
	log("Applying LED configuration...");
	if (configLEDs()) {
		log("LED configuration applied successfully!");

		// Create Matrix with actual LED configuration
		if (!g_driverConfig.devices.empty()) {
			const auto& firstDevice = g_driverConfig.devices[0];
			CRGB* leds = getLEDsForDevice(firstDevice.id);

			if (leds) {
				// Check if we need to recreate the Matrix (only if dimensions or layout changed)
				bool needsRecreation = false;
				uint16_t newWidth = 0;
				uint16_t newHeight = 0;
				String newLayout = firstDevice.layout;

				if (firstDevice.layout.startsWith("matrix-")) {
					newWidth = firstDevice.width;
					newHeight = firstDevice.height;
				} else {
					newWidth = firstDevice.count;
					newHeight = 1;
				}

				// Check if Matrix exists and if dimensions/layout changed
				if (matrix == nullptr) {
					needsRecreation = true;
					log("Creating Matrix for first time");
				} else if (matrix->width != newWidth || matrix->height != newHeight || matrix->layout != newLayout) {
					needsRecreation = true;
					log("Matrix dimensions or layout changed, recreating");
				}

				if (needsRecreation) {
					// Delete old matrix if it exists
					if (matrix != nullptr) {
						delete matrix;
						matrix = nullptr;
					}

					// Also need to clear EffectProcessor since it holds references to old Matrix
					extern EffectProcessor* effectProcessor;
					if (effectProcessor != nullptr) {
						delete effectProcessor;
						effectProcessor = nullptr;
						log("EffectProcessor cleared due to Matrix change");
					}

					// Create new Matrix with correct dimensions
					matrix = new Matrix(newWidth, newHeight, newLayout);
					log("Matrix created: " + String(newWidth) + "x" + String(newHeight) +
					    " with layout " + newLayout);

					// Replace the default allocated buffer with FastLED's actual buffer
					delete[] matrix->leds;
					matrix->leds = leds;

					log("Matrix now using FastLED buffer directly");
				} else {
					// Matrix dimensions haven't changed, just update LED buffer pointer
					matrix->leds = leds;
					log("Matrix dimensions unchanged, keeping existing Matrix and EffectProcessor");
				}
			}
		}

		log("LEDs are now ready for use");
	} else {
		log("ERROR: Failed to apply LED configuration");
		log("LEDs will use fallback behavior");
	}
}
