#include "network-init.h"
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <FastLED.h>
#include "mqtt.h"
#include "udp.h"
#include "display.h"
#include "utils.h"
#include "log.h"
#include "config_nvs.h"

// Forward declaration from main.cpp
void handleDriverConfig(const String& payload);

void setupNetworkServices(Matrix& matrix) {
	log("WiFi connected - setting up OTA, MQTT and UDP");
	fill_solid(matrix.leds, matrix.size, CRGB::Green);
	FastLED.show();

	// Update display to show connecting
	if (Display::isAvailable()) {
		Display::showConnecting(WiFi.SSID());
	}

	delay(500);

	// Setup OTA updates (must be done after WiFi is connected)
	// Use unique device name for OTA hostname (e.g., "rgfx-driver-f89a58")
	ArduinoOTA.setHostname(Utils::getDeviceName().c_str());
	ArduinoOTA.onStart([]() {
		log("OTA Update starting...");
		// Note: Cannot access matrix here - would need to be passed differently
		// For now, OTA visual feedback is handled in the callback
	});
	ArduinoOTA.onEnd([]() {
		log("OTA Update complete!");
	});
	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned int lastPercent = 0;
		unsigned int percent = (progress / (total / 100));
		if (percent != lastPercent && percent % 10 == 0) {
			log("OTA Progress: " + String(percent) + "%");
			lastPercent = percent;
		}
	});
	ArduinoOTA.onError([](ota_error_t error) {
		log("OTA Error: " + String(error));
	});
	ArduinoOTA.begin();
	delay(100); // Give OTA time to initialize
	log("OTA Ready");
	otaSetupDone = true;

	// Initialize mDNS for service discovery with unique device name
	if (MDNS.begin(Utils::getDeviceName().c_str())) {
		log("mDNS responder started as " + Utils::getDeviceName());
	} else {
		log("Error starting mDNS responder");
	}

	// Load saved LED configuration from NVS (if available)
	if (ConfigNVS::hasLEDConfig()) {
		log("Loading saved LED configuration from NVS...");
		String savedConfig = ConfigNVS::loadLEDConfig();
		if (savedConfig.length() > 0) {
			// Process saved config using same handler as MQTT
			handleDriverConfig(savedConfig);
		}
	} else {
		log("No saved LED config - will wait for Hub");
	}

	// Setup MQTT (will use mDNS to discover broker)
	setupMQTT();
	mqttSetupDone = true;

	setupUDP();
	udpSetupDone = true;

	// Update display to show connected status with actual MQTT status
	if (Display::isAvailable()) {
		Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(), mqttClient.connected());
	}

	// Go dark for normal operation
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	FastLED.show();
}

void cleanupNetworkServices(Matrix& matrix) {
	log("WiFi not connected - entering AP mode");
	fill_solid(matrix.leds, matrix.size, CRGB::Purple);
	FastLED.show();

	// Update display to show AP mode
	if (Display::isAvailable()) {
		Display::showAPMode(Utils::getDeviceName());
	}

	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;
}
