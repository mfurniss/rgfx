#include "network/network_init.h"
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <FastLED.h>
#include "network/mqtt.h"
#include "network/udp.h"
#include "oled/oled_display.h"
#include "utils.h"
#include "log.h"
#include "config/config_nvs.h"

// Forward declaration from main.cpp
void handleDriverConfig(const String& payload);

void setupNetworkServices(Matrix& matrix) {
	// Store LED buffer for OTA callbacks
	otaLEDs = matrix.leds;
	otaLEDCount = matrix.size;
	log("WiFi connected - setting up OTA, MQTT and UDP");
	fill_solid(matrix.leds, matrix.size, CRGB::Green);
	FastLED.show();

	// Disable WiFi power saving for low latency UDP
	WiFi.setSleep(WIFI_PS_NONE);
	WiFi.setTxPower(WIFI_POWER_19_5dBm);
	log("WiFi power saving disabled for low-latency operation");

	// Update display to show connecting
	if (Display::isAvailable()) {
		Display::showConnecting(WiFi.SSID(), Utils::getDeviceId());
	}

	delay(500);

	// Initialize mDNS FIRST (before ArduinoOTA)
	// ArduinoOTA.begin() also calls MDNS.begin(), which can cause conflicts
	// So we initialize mDNS once here, then let ArduinoOTA add its service
	if (MDNS.begin(Utils::getDeviceId().c_str())) {
		log("mDNS responder started as " + Utils::getDeviceId());
	} else {
		log("Error starting mDNS responder");
	}

	// Setup OTA updates (must be done after WiFi and mDNS are initialized)
	// Use unique device ID for OTA hostname (e.g., "rgfx-driver-0001")
	ArduinoOTA.setHostname(Utils::getDeviceId().c_str());
	ArduinoOTA.setMdnsEnabled(false);  // Disable internal MDNS.begin() - we already called it
	ArduinoOTA.onStart([]() {
		log("OTA Update starting...");
		otaInProgress = true;

		// Clear all LEDs
		if (otaLEDs && otaLEDCount > 0) {
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);
			FastLED.show();
		}
	});
	ArduinoOTA.onEnd([]() {
		log("OTA Update complete!");
		// Device will reboot automatically
	});
	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned int lastPercent = 0;
		unsigned int percent = (progress / (total / 100));

		// Log every 10%
		if (percent != lastPercent && percent % 10 == 0) {
			log("OTA Progress: " + String(percent) + "%");
			lastPercent = percent;
		}

		// Visual progress bar: light single orange LED at percentage position
		if (otaLEDs && otaLEDCount > 0) {
			// Clear all LEDs
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);

			// Calculate LED index from percentage (0-100% → 0 to size-1)
			int ledIndex = (percent * (otaLEDCount - 1)) / 100;

			// Light single orange LED at progress position
			otaLEDs[ledIndex] = CRGB::Orange;
			FastLED.show();
		}
	});
	ArduinoOTA.onError([](ota_error_t error) {
		log("OTA Error: " + String(error));
		otaInProgress = false;

		// Show error: all red for 5 seconds
		if (otaLEDs && otaLEDCount > 0) {
			fill_solid(otaLEDs, otaLEDCount, CRGB::Red);
			FastLED.show();
			delay(5000);

			// Clear LEDs
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);
			FastLED.show();
		}
	});
	ArduinoOTA.begin();

	// Manually advertise the Arduino OTA service since we disabled ArduinoOTA's internal mDNS
	MDNS.enableArduino(3232, false);  // Port 3232, no password

	delay(100);
	log("OTA Ready (advertising _arduino._tcp service on port 3232)");
	otaSetupDone = true;

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
		Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(), mqttClient.connected(), Utils::getDeviceId());
	}

	// Go dark for normal operation
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	FastLED.show();
}

void cleanupNetworkServices(Matrix& matrix) {
	log("WiFi not connected - entering AP mode");

	// Don't show purple LEDs if OTA is in progress (reset is imminent)
	if (!otaInProgress) {
		fill_solid(matrix.leds, matrix.size, CRGB::Purple);
		FastLED.show();
	}

	// Update display to show AP mode
	if (Display::isAvailable()) {
		Display::showAPMode(Utils::getDeviceId());
	}

	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;
}

// Forward declaration of global matrix from main.cpp
extern Matrix* matrix;

// Overload without Matrix for when it's not ready
void setupNetworkServices() {
	log("WiFi connected - setting up OTA, MQTT and UDP (no LED feedback yet)");

	// Clear LEDs if matrix is available (e.g., after reset when purple LEDs remain lit)
	if (matrix != nullptr) {
		fill_solid(matrix->leds, matrix->size, CRGB::Black);
		FastLED.show();
	}

	// Disable WiFi power saving for low latency UDP
	WiFi.setSleep(WIFI_PS_NONE);
	WiFi.setTxPower(WIFI_POWER_19_5dBm);
	log("WiFi power saving disabled for low-latency operation");

	// Update display to show connecting
	if (Display::isAvailable()) {
		Display::showConnecting(WiFi.SSID(), Utils::getDeviceId());
	}

	delay(500);

	// Initialize mDNS FIRST (before ArduinoOTA)
	if (MDNS.begin(Utils::getDeviceId().c_str())) {
		log("mDNS responder started as " + Utils::getDeviceId());
	} else {
		log("Error starting mDNS responder");
	}

	// Setup OTA updates (must be done after WiFi and mDNS are initialized)
	ArduinoOTA.setHostname(Utils::getDeviceId().c_str());
	ArduinoOTA.setMdnsEnabled(false);  // Disable internal MDNS.begin() - we already called it
	ArduinoOTA.onStart([]() {
		log("OTA Update starting...");
		otaInProgress = true;

		// Clear all LEDs
		if (otaLEDs && otaLEDCount > 0) {
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);
			FastLED.show();
		}
	});
	ArduinoOTA.onEnd([]() {
		log("OTA Update complete!");
		// Device will reboot automatically
	});
	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned int lastPercent = 0;
		unsigned int percent = (progress / (total / 100));

		// Log every 10%
		if (percent != lastPercent && percent % 10 == 0) {
			log("OTA Progress: " + String(percent) + "%");
			lastPercent = percent;
		}

		// Visual progress bar: light single orange LED at percentage position
		if (otaLEDs && otaLEDCount > 0) {
			// Clear all LEDs
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);

			// Calculate LED index from percentage (0-100% → 0 to size-1)
			int ledIndex = (percent * (otaLEDCount - 1)) / 100;

			// Light single orange LED at progress position
			otaLEDs[ledIndex] = CRGB::Orange;
			FastLED.show();
		}
	});
	ArduinoOTA.onError([](ota_error_t error) {
		log("OTA Error: " + String(error));
		otaInProgress = false;

		// Show error: all red for 5 seconds
		if (otaLEDs && otaLEDCount > 0) {
			fill_solid(otaLEDs, otaLEDCount, CRGB::Red);
			FastLED.show();
			delay(5000);

			// Clear LEDs
			fill_solid(otaLEDs, otaLEDCount, CRGB::Black);
			FastLED.show();
		}
	});
	ArduinoOTA.begin();

	// Manually advertise the Arduino OTA service since we disabled ArduinoOTA's internal mDNS
	MDNS.enableArduino(3232, false);  // Port 3232, no password

	delay(100);
	log("OTA Ready (advertising _arduino._tcp service on port 3232)");
	otaSetupDone = true;

	// Load saved LED configuration from NVS (if available)
	if (ConfigNVS::hasLEDConfig()) {
		log("Loading saved LED configuration from NVS...");
		String savedConfig = ConfigNVS::loadLEDConfig();
		if (savedConfig.length() > 0) {
			handleDriverConfig(savedConfig);
		}
	} else {
		log("No saved LED config - will wait for Hub");
	}

	// Setup MQTT
	setupMQTT();
	mqttSetupDone = true;

	setupUDP();
	udpSetupDone = true;

	// Update display
	if (Display::isAvailable()) {
		Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(), mqttClient.connected(), Utils::getDeviceId());
	}
}

void cleanupNetworkServices() {
	log("WiFi not connected - entering AP mode (no LED feedback yet)");

	// Don't clear LEDs if OTA is in progress (green success indicator should stay)
	// Update display to show AP mode
	if (Display::isAvailable()) {
		Display::showAPMode(Utils::getDeviceId());
	}

	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;
}
