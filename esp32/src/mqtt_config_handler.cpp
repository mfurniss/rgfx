#include "driver_config.h"
#include "dynamic_leds.h"
#include "log.h"
#include <WiFi.h>
#include <ArduinoJson.h>

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

	// Validate driver ID matches this device
	String configDriverId = doc["driver_id"] | "";
	String thisMacAddress = WiFi.macAddress();
	thisMacAddress.replace(":", "-");

	if (configDriverId != thisMacAddress) {
		log("WARNING: Config driver_id mismatch!");
		log("  Config for: " + configDriverId);
		log("  This device: " + thisMacAddress);
		// Still apply config - Hub might know better
	}

	// Clear existing configuration
	g_driverConfig.devices.clear();

	// Extract basic info
	g_driverConfig.driverId = configDriverId;
	g_driverConfig.friendlyName = doc["friendly_name"] | "Unknown";

	log("Config for: " + g_driverConfig.friendlyName + " (" + configDriverId + ")");

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
		devCfg.type = device["type"] | "";
		devCfg.count = device["count"] | 0;
		devCfg.offset = device["offset"] | 0;
		devCfg.chipset = device["chipset"] | "WS2812B";
		devCfg.colorOrder = device["color_order"] | "GRB";
		devCfg.maxBrightness = device["max_brightness"] | 255;

		// Matrix-specific fields
		if (devCfg.type == "matrix") {
			devCfg.width = device["width"] | 0;
			devCfg.height = device["height"] | 0;
			devCfg.serpentine = device["serpentine"] | false;

			log("Device: " + devCfg.name + " (" + devCfg.id + ")");
			log("  Pin: GPIO" + String(devCfg.pin) + ", Type: " + devCfg.type);
			log("  Matrix: " + String(devCfg.width) + "x" + String(devCfg.height));
			log("  Count: " + String(devCfg.count) + ", Offset: " + String(devCfg.offset));
			log("  Serpentine: " + String(devCfg.serpentine ? "yes" : "no"));
		} else {
			log("Device: " + devCfg.name + " (" + devCfg.id + ")");
			log("  Pin: GPIO" + String(devCfg.pin) + ", Type: " + devCfg.type);
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

	// Apply configuration immediately
	log("Applying LED configuration...");
	if (initializeDynamicLEDs()) {
		log("LED configuration applied successfully!");
		log("LEDs are now ready for use");

		// Show a brief white flash to indicate success
		clearAllLEDs();
		showAllLEDs();
		delay(100);

		// Flash white
		for (uint8_t i = 0; i < g_driverConfig.devices.size(); i++) {
			const auto& dev = g_driverConfig.devices[i];
			CRGB* leds = getLEDsForDevice(dev.id);
			uint16_t count = getLEDCountForDevice(dev.id);
			if (leds) {
				fill_solid(leds, count, CRGB::White);
			}
		}
		showAllLEDs();
		delay(200);

		// Back to black
		clearAllLEDs();
	} else {
		log("ERROR: Failed to apply LED configuration");
		log("LEDs will use fallback behavior");
	}
}
