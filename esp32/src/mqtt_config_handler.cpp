#include "driver_config.h"
#include "dynamic_leds.h"
#include "config_nvs.h"
#include "log.h"
#include "matrix.h"
#include <WiFi.h>
#include <ArduinoJson.h>

// External matrix used by game loop
extern Matrix matrix;

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
	if (doc.containsKey("settings")) {
		JsonObject settings = doc["settings"];
		g_driverConfig.globalBrightnessLimit = settings["global_brightness_limit"] | 255;
		g_driverConfig.gammaCorrection = settings["gamma_correction"] | 2.2;
		g_driverConfig.dithering = settings["dithering"] | true;
		g_driverConfig.updateRate = settings["update_rate"] | 60;

		log("Global settings:");
		log("  Brightness limit: " + String(g_driverConfig.globalBrightnessLimit));
		log("  Gamma: " + String(g_driverConfig.gammaCorrection));
		log("  Dithering: " + String(g_driverConfig.dithering ? "enabled" : "disabled"));
		log("  Update rate: " + String(g_driverConfig.updateRate) + " Hz");
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
	if (initializeDynamicLEDs()) {
		log("LED configuration applied successfully!");

		// Update matrix to use the first device's LED buffer and layout
		if (!g_driverConfig.devices.empty()) {
			const auto& firstDevice = g_driverConfig.devices[0];
			CRGB* leds = getLEDsForDevice(firstDevice.id);
			if (leds) {
				matrix.leds = leds;
				matrix.size = getLEDCountForDevice(firstDevice.id);

				// Update matrix dimensions and layout if it's a matrix layout
				if (firstDevice.layout.startsWith("matrix-")) {
					matrix.width = firstDevice.width;
					matrix.height = firstDevice.height;
					matrix.updateLayout(firstDevice.layout);
					log("Matrix updated: " + String(matrix.width) + "x" + String(matrix.height) +
					    " with layout " + firstDevice.layout);
				} else {
					// Strip layout - treat as 1D
					matrix.updateLayout(firstDevice.layout);
					log("Matrix updated to use layout: " + firstDevice.layout);
				}

				log("Matrix updated to use dynamic LED buffer");
			}
		}

		log("LEDs are now ready for use");
	} else {
		log("ERROR: Failed to apply LED configuration");
		log("LEDs will use fallback behavior");
	}
}
