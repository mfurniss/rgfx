/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <map>
#include "matrix.h"
#include "test.h"
#include "effects/effect_processor.h"
#include "network/network_init.h"
#include "config/config_portal.h"
#include "config/config_nvs.h"
#include "config/config_timeout.h"
#include "config/constants.h"
#include "driver_config.h"
#include "network/udp.h"
#include "network/mqtt.h"
#include "log.h"
#include "oled/oled_display.h"
#include "utils.h"
#include "version.h"
#include "serial.h"

// Forward declaration for config handling
void handleDriverConfig(const String& payload);

// Timing constants defined in config/constants.h:
// - FLASH_DURATION_MS: MQTT message flash duration
// - UPTIME_UPDATE_INTERVAL: OLED display refresh interval
// - AP_TIMEOUT_MS: WiFi AP mode timeout

Matrix matrix(WIDTH, HEIGHT);

// Global effect processor (initialized after driver comes online)
EffectProcessor* effectProcessor = nullptr;

// FreeRTOS task handle for network task on Core 0
TaskHandle_t networkTaskHandle = NULL;

// Track WiFi/MQTT/OTA connection state (shared between cores)
static bool wasConnected = false;
bool mqttSetupDone = false;  // Extern in network-init.h
bool udpSetupDone = false;   // Extern in network-init.h
bool otaSetupDone = false;   // Extern in network-init.h
static bool initialConnectionAttemptDone = false;

// Effect function pointer type
typedef void (*EffectFunction)(Matrix&, uint32_t);

// Effect lookup table
std::map<String, EffectFunction> effectMap = {
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
		delay(2000);  // Show boot screen for 2 seconds
	} else {
		log("Running without OLED display");
	}

	// Wait for setup to complete initialization
	delay(500);

	// Track last uptime update for periodic display refresh
	unsigned long lastUptimeUpdate = 0;

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
		vTaskDelay(10 / portTICK_PERIOD_MS);  // 10ms delay
	}
}

void setup() {
	Serial.begin(115200);
	delay(200);

	// Initialize serial command system (must be done before any log() calls)
	SerialCommand::begin();

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
	// Fallback initialization removed - was causing brightness issues by creating
	// duplicate controllers on the same pin

	// WiFi connection happens asynchronously
	log("Connecting to WiFi...");

	// Create network task on Core 0
	// Priority 1 (same as loop), 8KB stack
	xTaskCreatePinnedToCore(networkTask,         // Task function
	                        "NetworkTask",       // Task name
	                        8192,                // Stack size (bytes)
	                        NULL,                // Parameters
	                        1,                   // Priority (1 = same as loop)
	                        &networkTaskHandle,  // Task handle
	                        0                    // Core 0 (protocol core)
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
	uint32_t minFrameTimeMs = 1000 / g_driverConfig.updateRate;  // e.g., 8ms @ 120 FPS

	// Early return if not enough time has elapsed (non-blocking time-based gating)
	if (now - lastFrameTime < minFrameTimeMs) {
		yield();  // Give time to other tasks
		return;
	}

	// Calculate actual delta-time for hardware-independent animation speeds
	float deltaTime = (now - lastFrameTime) / 1000.0f;  // Seconds elapsed
	lastFrameTime = now;

	// Note: deltaTime is available for future effects system
	// Effects can use it for movement calculations: position += velocity * deltaTime
	(void)deltaTime;  // Suppress unused variable warning until effects system uses it

	// Check WiFi connection state and update LEDs accordingly
	bool isConnected = ConfigPortal::isWiFiConnected();
	String state = ConfigPortal::getStateName();

	// Check if in AP mode (NotConfigured or ApMode states)
	static bool inApMode = false;
	static unsigned long apModeStartTime = 0;
	static unsigned long lastCountdownUpdate = 0;
	const uint16_t AP_TIMEOUT_SECONDS = AP_TIMEOUT_MS / 1000;  // Derived from config_timeout.h
	bool nowInApMode = (state == "NotConfigured" || state == "ApMode");

	if (nowInApMode && !inApMode) {
		// Just entered AP mode - show PURPLE immediately (unless in test mode)
		if (!testModeActive) {
			log("Entering AP mode - LEDs PURPLE");
			fill_solid(matrix.leds, matrix.size, CRGB::Purple);
			FastLED.show();
		}
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
			setupNetworkServices(matrix);
		} else {
			cleanupNetworkServices(matrix);
		}
	}

	// Process serial commands (thread-safe, buffered input)
	SerialCommand::process();

	// Core 1: Only process UDP and LED effects (time-critical tasks)
	// MQTT, OTA, and web server are handled on Core 0 by networkTask
	if (isConnected && udpSetupDone) {
		// Process incoming UDP packets (low-latency game events)
		processUDP();

		// Initialize effect processor on first run
		if (effectProcessor == nullptr) {
			effectProcessor = new EffectProcessor(matrix);
		}

		// Check for UDP message updates
		UDPMessage message;
		if (checkUDPMessage(&message)) {
			effectProcessor->addEffect(message.effect, message.props);
		}

		// Update and render continuous effects (skip if test mode is active)
		if (!testModeActive) {
			effectProcessor->update();
		}
	}

	// Yield to task scheduler (prevents watchdog timer issues)
	yield();
}
