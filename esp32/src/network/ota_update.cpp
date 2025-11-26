/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "network/ota_update.h"
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <FastLED.h>
#include "config/config_leds.h"
#include "driver_config.h"
#include "log.h"
#include "network/network_init.h"
#include "utils.h"

void setupOTA() {
	ArduinoOTA.setHostname(Utils::getDeviceId().c_str());
	ArduinoOTA.setMdnsEnabled(false);  // Disable internal MDNS.begin() - already initialized

	ArduinoOTA.onStart([]() {
		log("OTA Update starting...");
		otaInProgress = true;

		// Clear all LEDs at start
		if (!g_driverConfig.devices.empty()) {
			const auto& firstDevice = g_driverConfig.devices[0];
			CRGB* leds = getLEDsForDevice(firstDevice.id);
			if (leds) {
				fill_solid(leds, firstDevice.count, CRGB::Black);
				FastLED.show();
			}
		}
	});

	ArduinoOTA.onEnd([]() {
		log("OTA Update complete!");
		// Device will reboot automatically
	});

	ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
		static unsigned int lastPercent = 0;
		float percent = (float)progress / (float)total * 100.0f;

		// Log every 10%
		if ((unsigned int)percent != lastPercent && (unsigned int)percent % 10 == 0) {
			log("OTA Progress: " + String((unsigned int)percent) + "%");
			lastPercent = (unsigned int)percent;
		}

		// Show progress indicator on LEDs
		if (!g_driverConfig.devices.empty()) {
			const auto& firstDevice = g_driverConfig.devices[0];
			CRGB* leds = getLEDsForDevice(firstDevice.id);
			if (leds) {
				// Calculate LED index from percentage (0-100% → 0 to size-1)
				int ledIndex = (int)(percent * (firstDevice.count - 1) / 100.0f);

				if (ledIndex > 0) {
					fill_solid(leds, ledIndex, CRGB(0x000020));
				}

				leds[ledIndex] = CRGB::White;
				FastLED.show();
			}
		}
	});

	ArduinoOTA.onError([](ota_error_t error) {
		log("OTA Error: " + String(error));
		otaInProgress = false;

		// Show error: all red for 5 seconds
		if (!g_driverConfig.devices.empty()) {
			const auto& firstDevice = g_driverConfig.devices[0];
			CRGB* leds = getLEDsForDevice(firstDevice.id);
			if (leds) {
				fill_solid(leds, firstDevice.count, CRGB::Red);
				FastLED.show();
				delay(5000);

				// Clear LEDs
				fill_solid(leds, firstDevice.count, CRGB::Black);
				FastLED.show();
			}
		}
	});

	ArduinoOTA.begin();

	// Manually advertise the Arduino OTA service since we disabled ArduinoOTA's internal mDNS
	MDNS.enableArduino(3232, false);  // Port 3232, no password

	delay(100);
	log("OTA Ready (advertising _arduino._tcp service on port 3232)");
	otaSetupDone = true;
}
