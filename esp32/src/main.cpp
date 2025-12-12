/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <atomic>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <new>
#include "graphics/matrix.h"
#include "effects/effect_processor.h"
#include "network/network_init.h"
#include "network/network_task.h"
#include "config/config_portal.h"
#include "config/config_nvs.h"
#include "config/config_leds.h"
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
#include "crash_handler.h"
#include "graphics/downsample_to_matrix.h"
#include "hal/display.h"
#include "hal/led_controller.h"

// Forward declaration for config handling
void handleDriverConfig(const String& payload);

// Forward declaration for lazy Matrix creation
static void createMatrixIfNeeded();

// Timing constants defined in config/constants.h:
// - FLASH_DURATION_MS: MQTT message flash duration
// - UPTIME_UPDATE_INTERVAL: OLED display refresh interval
// - AP_TIMEOUT_MS: WiFi AP mode timeout

// Global matrix pointer - initialized only after LED configuration is received
Matrix* matrix = nullptr;

// Global effect processor (initialized after driver comes online)
EffectProcessor* effectProcessor = nullptr;

// FreeRTOS task handle for network task on Core 0
TaskHandle_t networkTaskHandle = NULL;

// Track WiFi/MQTT/OTA connection state (shared between cores)
// std::atomic ensures proper memory ordering across ESP32 cores
static bool wasConnected = false;
std::atomic<bool> mqttSetupDone(false);  // Extern in network_init.h
std::atomic<bool> udpSetupDone(false);   // Extern in network_init.h
std::atomic<bool> otaSetupDone(false);   // Extern in network_init.h
std::atomic<bool> otaInProgress(false);  // Extern in network_init.h - Track OTA upload state
static bool initialConnectionAttemptDone = false;

void setup() {
	Serial.begin(115200);
	delay(200);

	// Initialize serial command system (must be done before any log() calls)
	SerialCommand::begin();

	// Initialize log queue for thread-safe remote logging
	// Must be done before any log() calls that could be sent to hub
	initLogQueue();

	// Check for previous crash BEFORE anything else that might crash
	// This logs crash info to Serial immediately
	initCrashHandler();

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

	// Initialize gamma LUT to linear (1:1) before any LED operations
	// Will be rebuilt when config is received from Hub
	rebuildGammaLUT();

	// Power-on LED test - light all LEDs green if config exists
	if (ConfigNVS::hasLEDConfig()) {
		log("Running power-on LED test...");
		String savedConfig = ConfigNVS::loadLEDConfig();
		if (savedConfig.length() > 0) {
			// Parse and apply LED config
			handleDriverConfig(savedConfig);

			// Get first device and light all LEDs green
			if (!g_driverConfig.devices.empty()) {
				const auto& firstDevice = g_driverConfig.devices[0];
				CRGB* leds = getLEDsForDevice(firstDevice.id);
				if (leds) {
					fill_solid(leds, firstDevice.count, CRGB::Green);
					hal::getLedController().show();
				}
			}
		}
	}

	// Start config portal to handle WiFi connection
	// Note: WiFi connection happens asynchronously in IotWebConf's doLoop()
	ConfigPortal::begin();

	// WiFi connection happens asynchronously
	log("Connecting to WiFi...");

	// Create network task on Core 0
	// Priority 1 (same as loop), 16KB stack
	// Stack must be large enough for MQTT config handling which parses JSON and
	// creates LEDDeviceConfig structs (~200 bytes each) plus String temporaries
	xTaskCreatePinnedToCore(networkTask,         // Task function
	                        "NetworkTask",       // Task name
	                        16384,               // Stack size (bytes) - increased for config parsing
	                        NULL,                // Parameters
	                        1,                   // Priority (1 = same as loop)
	                        &networkTaskHandle,  // Task handle
	                        0                    // Core 0 (protocol core)
	);

	log("Network task created on Core 0");
}

/**
 * Create Matrix lazily when FastLED is initialized and config is available
 * Matrix is created on Core 1 (main loop) to avoid race conditions
 */
static void createMatrixIfNeeded() {
	// Skip if Matrix already exists or FastLED not ready
	if (matrix != nullptr || !isFastLEDInitialized() || g_driverConfig.devices.empty()) {
		return;
	}

	const auto& firstDevice = g_driverConfig.devices[0];
	CRGB* leds = getLEDsForDevice(firstDevice.id);
	if (!leds) {
		return;
	}

	log("Creating Matrix...");

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

	// Check if unified config (multi-panel or has rotation)
	bool hasRotation = false;
	for (uint8_t rot : firstDevice.panelRotation) {
		if (rot != 0) {
			hasRotation = true;
			break;
		}
	}
	bool isUnified = firstDevice.unifiedRows > 1 || firstDevice.unifiedCols > 1 || hasRotation;

	if (isUnified) {
		matrix = new (std::nothrow) Matrix(
		    firstDevice.panelWidth, firstDevice.panelHeight,
		    firstDevice.unifiedCols, firstDevice.unifiedRows,
		    firstDevice.panelOrder.data(),
		    firstDevice.panelRotation.data(),
		    newLayout
		);
	} else {
		matrix = new (std::nothrow) Matrix(newWidth, newHeight, newLayout);
	}

	if (!matrix) {
		log("ERROR: Failed to allocate Matrix");
		return;
	}
	if (!matrix->isValid()) {
		log("ERROR: Matrix allocation failed internally");
		delete matrix;
		matrix = nullptr;
		return;
	}

	if (!isUnified) {
		log("Matrix created: " + String(newWidth) + "x" + String(newHeight) +
		    " with layout " + newLayout);
	}

	// Replace the default allocated buffer with FastLED's actual buffer
	free(matrix->leds);
	matrix->leds = leds;

	log("Matrix now using FastLED buffer directly");
	log("LEDs are now ready for use");
}

// Main loop - runs on Core 1 (application core)
// Focused on time-critical LED effects and low-latency UDP processing
void loop() {
	// Process UDP FIRST - outside frame rate gate for lowest latency
	// This ensures UDP packets are processed immediately without waiting for frame timing
	// Pause UDP effect processing during OTA
	bool isConnected = ConfigPortal::isWiFiConnected();
	if (isConnected && udpSetupDone && !otaInProgress) {
		processUDP();
	}

	// Frame rate limiting (VRR with configurable soft cap)
	// Calculate minimum frame time based on configured update rate (default 120 FPS)
	static uint32_t lastFrameTime = 0;
	uint32_t now = millis();
	uint32_t minFrameTimeMs = 1000 / g_driverConfig.updateRate;  // e.g., 8ms @ 120 FPS

	// Early return if not enough time has elapsed (non-blocking time-based gating)
	// Note: UDP processing above still happens every iteration for low latency
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
	// Note: isConnected already declared at top of loop() for UDP processing
	String state = ConfigPortal::getStateName();

	// Check if in AP mode (NotConfigured or ApMode states)
	static bool inApMode = false;
	static unsigned long apModeStartTime = 0;
	static unsigned long lastCountdownUpdate = 0;
	const uint16_t AP_TIMEOUT_SECONDS = AP_TIMEOUT_MS / 1000;  // Derived from config_timeout.h
	bool nowInApMode = (state == "NotConfigured" || state == "ApMode");

	if (nowInApMode && !inApMode) {
		// Just entered AP mode - show PURPLE immediately (unless in test mode)
		// Check both matrix and leds pointers for safety
		if (!testModeActive && matrix != nullptr && matrix->leds != nullptr) {
			log("Entering AP mode - LEDs PURPLE");
			fill_solid(matrix->leds, matrix->size, CRGB::Purple);
			hal::getLedController().show();
		}
		inApMode = true;
		initialConnectionAttemptDone = true;
		apModeStartTime = millis();

		// Update display to show AP mode
		if (Display::isAvailable()) {
			Display::showAPMode(Utils::getDeviceId());
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

	// Process serial commands ALWAYS (even during AP mode or connection attempts)
	// This allows wifi credentials to be set via serial at any time
	SerialCommand::process();

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
			if (matrix != nullptr) {
				setupNetworkServices(*matrix);
			} else {
				// Matrix not ready yet, just setup network without LED feedback
				setupNetworkServices();
			}
		} else {
			if (matrix != nullptr) {
				cleanupNetworkServices(*matrix);
			} else {
				// Matrix not ready, just cleanup without LED feedback
				cleanupNetworkServices();
			}
		}
	}

	// Core 1: Process LED effects (time-critical tasks)
	// MQTT, OTA, and web server are handled on Core 0 by networkTask
	// UDP is processed at top of loop() for lowest latency
	// Skip effect processing during OTA to prevent clearing progress indicator
	// Skip during config update to prevent race conditions with Core 0
	if (isConnected && udpSetupDone && !otaInProgress && !g_configUpdateInProgress) {
		// Create Matrix lazily when FastLED is ready (only happens once)
		createMatrixIfNeeded();

		// Initialize effect processor on first run (only if matrix is ready and valid)
		if (effectProcessor == nullptr && matrix != nullptr && matrix->isValid()) {
			effectProcessor = new (std::nothrow) EffectProcessor(*matrix, hal::getDisplay());
			if (!effectProcessor) {
				log("ERROR: Failed to allocate EffectProcessor");
			}
		}

		// Process all queued UDP messages
		UDPMessage message;
		while (checkUDPMessage(&message) && effectProcessor != nullptr) {
			effectProcessor->addEffect(String(message.effect), message.props);
			log("UDP RX from Hub: effect=" + String(message.effect));
		}

		// Update and render continuous effects
		if (effectProcessor != nullptr) {
			effectProcessor->update();
		}
	}

	// Update crash handler with current uptime (so we know uptime at crash)
	updateCrashUptime();

	// Yield to task scheduler (prevents watchdog timer issues)
	yield();
}
