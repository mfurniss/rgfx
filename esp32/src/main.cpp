/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <map>
#include "matrix.h"
#include "effects/fire.h"
#include "effects/wave.h"
#include "effects/sparkle.h"
#include "effects/pulse.h"
#include "config_portal.h"
#include "config_leds.h"
#include "udp.h"
#include "mqtt.h"
#include "log.h"

#define FLASH_DURATION_MS  10  // MQTT message flash duration

Matrix matrix(WIDTH, HEIGHT);

// Effect function pointer type
typedef void (*EffectFunction)(Matrix&, uint32_t);

// Effect lookup table
std::map<String, EffectFunction> effectMap = {
	{"pulse", pulse}
	// Add more effects here
};

void setup() {
	Serial.begin(115200);
	delay(200);
	log("\n\nRGFX Driver starting...");

	// Start config portal first to load configuration
	// Note: WiFi connection happens asynchronously in IotWebConf's doLoop()
	ConfigPortal::begin();

	// Initialize LEDs with configured parameters
	ConfigLeds::initLeds(matrix);

	// Show BLUE while connecting to WiFi / in config portal
	log("Connecting to WiFi...");
	fill_solid(matrix.leds, matrix.size, CRGB::Blue);
	FastLED.show();
}

// Track WiFi connection state
static bool wasConnected = false;
static bool udpSetupDone = false;
static bool otaSetupDone = false;
static bool initialConnectionAttemptDone = false;

void loop() {
	// Process config portal web requests (MUST be called in loop)
	ConfigPortal::process();

	// Check WiFi connection state and update LEDs accordingly
	bool isConnected = ConfigPortal::isWiFiConnected();
	String state = ConfigPortal::getStateName();

	// Check if in AP mode (NotConfigured or ApMode states)
	static bool inApMode = false;
	bool nowInApMode = (state == "NotConfigured" || state == "ApMode");

	if (nowInApMode && !inApMode) {
		// Just entered AP mode - show PURPLE immediately
		log("Entering AP mode - LEDs PURPLE");
		fill_solid(matrix.leds, matrix.size, CRGB::Purple);
		FastLED.show();
		inApMode = true;
		initialConnectionAttemptDone = true;
		return;
	}
	inApMode = nowInApMode;

	// If we haven't made initial connection attempt yet, keep LEDs BLUE (trying to connect)
	if (!initialConnectionAttemptDone && !isConnected) {
		// Still waiting for initial connection attempt to complete
		// LEDs stay BLUE until we know the result
		return;
	}

	if (isConnected != wasConnected) {
		// WiFi state changed
		wasConnected = isConnected;
		initialConnectionAttemptDone = true;

		if (isConnected) {
			// Just connected - setup OTA, MQTT, UDP and show GREEN briefly
			log("WiFi connected - setting up OTA, MQTT and UDP");
			fill_solid(matrix.leds, matrix.size, CRGB::Green);
			FastLED.show();
			delay(500);

			// Setup OTA updates (must be done after WiFi is connected)
			// NOTE: For multiple devices, customize hostname per device (e.g., "rgfx-driver-1", "rgfx-driver-2")
			ArduinoOTA.setHostname("rgfx-driver");
			ArduinoOTA.onStart([]() {
				log("OTA Update starting...");
				fill_solid(matrix.leds, matrix.size, CRGB::Orange);
				FastLED.show();
			});
			ArduinoOTA.onEnd([]() {
				log("OTA Update complete!");
				fill_solid(matrix.leds, matrix.size, CRGB::Green);
				FastLED.show();
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
				fill_solid(matrix.leds, matrix.size, CRGB::Red);
				FastLED.show();
			});
			ArduinoOTA.begin();
			delay(100);  // Give OTA time to initialize
			log("OTA Ready");
			otaSetupDone = true;

			// Initialize mDNS for service discovery
			if (MDNS.begin("rgfx-driver")) {
				log("mDNS responder started");
			} else {
				log("Error starting mDNS responder");
			}

			// Setup MQTT (will use mDNS to discover broker)
			setupMQTT();

			setupUDP();
			udpSetupDone = true;

			// Go dark for normal operation
			fill_solid(matrix.leds, matrix.size, CRGB::Black);
			FastLED.show();
		} else {
			// Disconnected or failed to connect - show PURPLE (AP mode)
			log("WiFi not connected - entering AP mode");
			fill_solid(matrix.leds, matrix.size, CRGB::Purple);
			FastLED.show();
			udpSetupDone = false;
			otaSetupDone = false;
		}
	}

	// Check for serial commands (for debugging)
	if (Serial.available()) {
		String cmd = Serial.readStringUntil('\n');
		cmd.trim();
		if (cmd == "factory_reset") {
			log("Factory reset: Erasing WiFi credentials and rebooting...");
			ConfigPortal::resetSettings();
			delay(1000);
			ESP.restart();
		}
	}

	// Only process UDP/OTA if WiFi is connected and setup is done
	if (isConnected && udpSetupDone && otaSetupDone) {
		// Handle OTA updates
		ArduinoOTA.handle();

		// Handle MQTT
		mqttLoop();

		// Process incoming UDP packets
		processUDP();

		// Check for UDP message updates
		UDPMessage message;
		if (checkUDPMessage(&message)) {
			// Look up effect in map and call it
			auto it = effectMap.find(message.effect);
			if (it != effectMap.end()) {
				it->second(matrix, message.color);
			}
		}

		// Fade to black for flash effect
		fadeToBlackBy(matrix.leds, matrix.size, 50);
		FastLED.show();
	}

	// Yield to task scheduler (prevents watchdog timer issues)
	delay(1);
}
