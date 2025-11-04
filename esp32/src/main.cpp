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
#include "effects/test.h"
#include "config_portal.h"
#include "config_nvs.h"
#include "config_timeout.h"
#include "driver_config.h"
#include "udp.h"
#include "mqtt.h"
#include "log.h"
#include "display.h"
#include "utils.h"
#include "version.h"

// Forward declaration for config handling
void handleDriverConfig(const String& payload);

#define FLASH_DURATION_MS 10 // MQTT message flash duration

Matrix matrix(WIDTH, HEIGHT);

// FreeRTOS task handle for network task on Core 0
TaskHandle_t networkTaskHandle = NULL;

// Track WiFi/MQTT/OTA connection state (shared between cores)
static bool wasConnected = false;
static bool mqttSetupDone = false;
static bool udpSetupDone = false;
static bool otaSetupDone = false;
static bool initialConnectionAttemptDone = false;

// Effect function pointer type
typedef void (*EffectFunction)(Matrix&, uint32_t);

// Effect lookup table
std::map<String, EffectFunction> effectMap = {
	{"pulse", pulse},
	{"test", test}
	// Add more effects here
};

// Network Task - runs on Core 0 (protocol core)
// Handles MQTT, web server, OTA, and OLED display updates
void networkTask(void* parameter) {
	log("Network task started on Core " + String(xPortGetCoreID()));

	// Initialize OLED display (optional - gracefully handles missing display)
	bool hasDisplay = Display::begin();
	if (hasDisplay) {
		log("OLED display available - status display enabled");
		Display::showBoot(Utils::getDeviceName());
		delay(2000); // Show boot screen for 2 seconds
	} else {
		log("Running without OLED display");
	}

	// Wait for setup to complete initialization
	delay(500);

	// Track last uptime update for periodic display refresh
	unsigned long lastUptimeUpdate = 0;
	const unsigned long UPTIME_UPDATE_INTERVAL =
		5000; // Update every 5 seconds (reduced frequency to prevent I2C issues)

	// Main network task loop
	while (true) {
		// Process config portal web requests (MUST be called regularly)
		ConfigPortal::process();

		// Handle MQTT independently (only needs WiFi)
		bool isConnected = ConfigPortal::isWiFiConnected();
		if (isConnected && mqttSetupDone) {
			mqttLoop();
		}

		// Only process OTA if WiFi is connected and setup is done
		if (isConnected && otaSetupDone) {
			ArduinoOTA.handle();
		}

		// Update OLED display uptime periodically (if available and connected)
		if (hasDisplay && isConnected) {
			unsigned long now = millis();
			if (now - lastUptimeUpdate >= UPTIME_UPDATE_INTERVAL) {
				Display::updateUptime(now / 1000);
				lastUptimeUpdate = now;
			}
		}

		// Yield to other tasks and prevent watchdog timeout
		vTaskDelay(10 / portTICK_PERIOD_MS); // 10ms delay
	}
}

void setup() {
	Serial.begin(115200);
	delay(200);
	log("\n\nRGFX Driver v" + String(RGFX_VERSION) + " starting...");
	log("Core 0: Protocol/Network core (WiFi, MQTT, Web, Display)");
	log("Core 1: Application core (LEDs, UDP effects)");

	// Reduce WiFi transmit power to minimize power draw spikes
	// This helps prevent display blinking caused by voltage fluctuations
	// Range: WIFI_POWER_19_5dBm (highest) to WIFI_POWER_2dBm (lowest)
	// 11dBm provides good range while reducing current spikes
	WiFi.setTxPower(WIFI_POWER_11dBm);
	log("WiFi TX power set to 11dBm (reduced for power stability)");

	// Initialize NVS configuration
	ConfigNVS::begin();

	// Start config portal to handle WiFi connection
	// Note: WiFi connection happens asynchronously in IotWebConf's doLoop()
	ConfigPortal::begin();

	// Note: LEDs will be initialized by configLEDs() when Hub config is received
	// For now, just initialize FastLED with default 8x8 matrix for connection status display
	FastLED.addLeds<WS2812B, 16, GRB>(matrix.leds, matrix.size);
	FastLED.setBrightness(64);

	// Show BLUE while connecting to WiFi / in config portal
	log("Connecting to WiFi...");
	fill_solid(matrix.leds, matrix.size, CRGB::Blue);
	FastLED.show();

	// Create network task on Core 0
	// Priority 1 (same as loop), 8KB stack
	xTaskCreatePinnedToCore(networkTask,        // Task function
	                        "NetworkTask",      // Task name
	                        8192,               // Stack size (bytes)
	                        NULL,               // Parameters
	                        1,                  // Priority (1 = same as loop)
	                        &networkTaskHandle, // Task handle
	                        0                   // Core 0 (protocol core)
	);

	log("Network task created on Core 0");
}

// Main loop - runs on Core 1 (application core)
// Focused on time-critical LED effects and low-latency UDP processing
void loop() {
	// Frame rate limiting (VRR with configurable soft cap)
	// Calculate minimum frame time based on configured update rate (default 120 FPS)
	static uint32_t lastFrameTime = 0;
	uint32_t now = millis();
	uint32_t minFrameTimeMs = 1000 / g_driverConfig.updateRate; // e.g., 8ms @ 120 FPS

	// Early return if not enough time has elapsed (non-blocking time-based gating)
	if (now - lastFrameTime < minFrameTimeMs) {
		yield(); // Give time to other tasks
		return;
	}

	// Calculate actual delta-time for hardware-independent animation speeds
	float deltaTime = (now - lastFrameTime) / 1000.0f; // Seconds elapsed
	lastFrameTime = now;

	// Note: deltaTime is available for future effects system
	// Effects can use it for movement calculations: position += velocity * deltaTime
	(void)deltaTime; // Suppress unused variable warning until effects system uses it

	// Check WiFi connection state and update LEDs accordingly
	bool isConnected = ConfigPortal::isWiFiConnected();
	String state = ConfigPortal::getStateName();

	// Check if in AP mode (NotConfigured or ApMode states)
	static bool inApMode = false;
	static unsigned long apModeStartTime = 0;
	static unsigned long lastCountdownUpdate = 0;
	const uint16_t AP_TIMEOUT_SECONDS = AP_TIMEOUT_MS / 1000; // Derived from config_timeout.h
	bool nowInApMode = (state == "NotConfigured" || state == "ApMode");

	if (nowInApMode && !inApMode) {
		// Just entered AP mode - show PURPLE immediately
		log("Entering AP mode - LEDs PURPLE");
		fill_solid(matrix.leds, matrix.size, CRGB::Purple);
		FastLED.show();
		inApMode = true;
		initialConnectionAttemptDone = true;
		apModeStartTime = millis();

		// Update display to show AP mode
		if (Display::isAvailable()) {
			Display::showAPMode(Utils::getDeviceName());
		}

		return;
	}

	// Update AP mode countdown every second
	if (nowInApMode && Display::isAvailable()) {
		unsigned long now = millis();
		if (now - lastCountdownUpdate >= 1000) {
			uint16_t elapsed = (now - apModeStartTime) / 1000;
			uint16_t remaining =
				(elapsed < AP_TIMEOUT_SECONDS) ? (AP_TIMEOUT_SECONDS - elapsed) : 0;
			Display::updateAPModeCountdown(remaining);
			lastCountdownUpdate = now;
		}
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
				Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(),
				                       mqttClient.connected());
			}

			// Go dark for normal operation
			fill_solid(matrix.leds, matrix.size, CRGB::Black);
			FastLED.show();
		} else {
			// Disconnected or failed to connect - show PURPLE (AP mode)
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
		} else if (cmd.startsWith("wifi ")) {
			// Format: wifi SSID PASSWORD
			// Example: wifi MyNetwork MyPassword123
			// Example: wifi "My Network" "My Password 123"
			String params = cmd.substring(5); // Remove "wifi " prefix
			params.trim();

			// Parse SSID and password (supports quoted strings with spaces)
			String ssid = "";
			String password = "";

			int firstQuote = params.indexOf('"');
			if (firstQuote == 0) {
				// Quoted SSID
				int secondQuote = params.indexOf('"', 1);
				if (secondQuote > 0) {
					ssid = params.substring(1, secondQuote);
					String remainder = params.substring(secondQuote + 1);
					remainder.trim();

					// Check for quoted password
					if (remainder.length() > 0 && remainder.charAt(0) == '"') {
						int thirdQuote = remainder.indexOf('"', 1);
						if (thirdQuote > 0) {
							password = remainder.substring(1, thirdQuote);
						}
					} else {
						// Unquoted password
						password = remainder;
					}
				}
			} else {
				// Unquoted SSID and password (space-separated)
				int spacePos = params.indexOf(' ');
				if (spacePos > 0) {
					ssid = params.substring(0, spacePos);
					password = params.substring(spacePos + 1);
					password.trim();
				} else {
					// SSID only, no password
					ssid = params;
				}
			}

			if (ssid.length() > 0) {
				log("Setting WiFi credentials from serial command...");
				if (ConfigPortal::setWiFiCredentials(ssid, password)) {
					log("WiFi credentials saved! Restarting in 2 seconds...");
					delay(2000);
					ESP.restart();
				} else {
					log("ERROR: Failed to set WiFi credentials");
				}
			} else {
				log("ERROR: Invalid wifi command format");
				log("Usage: wifi SSID PASSWORD");
				log("Example: wifi MyNetwork MyPassword123");
				log("Example: wifi \"My Network\" \"My Password 123\"");
			}
		} else if (cmd == "help") {
			log("\n=== RGFX Driver Serial Commands ===");
			log("wifi SSID PASSWORD   - Set WiFi credentials and restart");
			log("                       Supports quoted strings for SSIDs/passwords with spaces");
			log("                       Example: wifi MyNetwork MyPassword123");
			log("                       Example: wifi \"My Network\" \"My Password 123\"");
			log("factory_reset        - Erase WiFi credentials and restart");
			log("help                 - Show this help message");
		}
	}

	// Core 1: Only process UDP and LED effects (time-critical tasks)
	// MQTT, OTA, and web server are handled on Core 0 by networkTask
	if (isConnected && udpSetupDone) {
		// Process incoming UDP packets (low-latency game events)
		processUDP();

		// Check for UDP message updates
		UDPMessage message;
		if (checkUDPMessage(&message)) {
			// Look up effect in map and call it
			auto it = effectMap.find(message.effect);
			if (it != effectMap.end()) {
				it->second(matrix, message.color);
				FastLED.show();  // Display the effect immediately
			}
		}

		// Fade to black for flash effect (skip if test mode is active)
		if (!testModeActive) {
			fadeToBlackBy(matrix.leds, matrix.size, 50);
			FastLED.show();
		}
	}

	// Yield to task scheduler (prevents watchdog timer issues)
	yield();
}
