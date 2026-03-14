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
#include "config/constants.h"
#include "driver_config.h"
#include "network/udp.h"
#include "network/mqtt.h"
#include "log.h"
#include "utils.h"
#include "version.h"
#include "serial.h"
#include "crash_handler.h"
#include "safe_restart.h"
#include "graphics/downsample_to_matrix.h"
#include "hal/display.h"
#include "hal/led_controller.h"
#include <nvs_flash.h>

// Forward declaration for config handling
void handleDriverConfig(const String& payload);

// Forward declaration for lazy Matrix creation
static void createMatrixIfNeeded();

// Global matrix pointer - initialized only after LED configuration is received
Matrix* matrix = nullptr;

// FPS tracking - calculated once per second, reported via telemetry
static float g_currentFps = 0.0f;
static float g_minFps = 999.0f;
static float g_maxFps = 0.0f;
static uint32_t g_frameCount = 0;
static uint32_t g_lastFpsCalcTime = 0;

// Frame watchdog - Core 0 pings, Core 1 responds
// If Core 1 doesn't respond, Core 0 requests clear, then restarts if still stuck
std::atomic<bool> watchdogPing(false);            // Core 0 sets to request pong
std::atomic<bool> watchdogPong(false);            // Core 1 sets to respond
static constexpr uint32_t FRAME_WATCHDOG_TIMEOUT_MS = 2000;

// FPS getters for telemetry
float getCurrentFps() { return g_currentFps; }
float getMinFps() { return g_minFps; }
float getMaxFps() { return g_maxFps; }

// Global effect processor (initialized after driver comes online)
EffectProcessor* effectProcessor = nullptr;

// FreeRTOS task handle for network task on Core 0
TaskHandle_t networkTaskHandle = NULL;

// Track WiFi/MQTT/OTA connection state (shared between cores)
// std::atomic ensures proper memory ordering across ESP32 cores
static bool wasConnected = false;
std::atomic<bool> mqttSetupDone(false);       // Extern in network_init.h
std::atomic<bool> udpSetupDone(false);        // Extern in network_init.h
std::atomic<bool> otaSetupDone(false);        // Extern in network_init.h
std::atomic<bool> otaInProgress(false);       // Extern in network_init.h - Track OTA upload state
std::atomic<bool> pendingClearEffects(false); // Extern in network_init.h - Clear effects from Core 1
std::atomic<bool> pendingRestart(false);      // Extern in network_init.h - Restart requested
std::atomic<bool> mqttEventReceived(false);   // Signal from Core 0 when MQTT message received
static bool initialConnectionAttemptDone = false;

// Onboard LED indicator state
static unsigned long indicatorOffTime = 0;
static bool wasConnecting = false;

// BOOT button state for test mode toggle
static bool lastButtonState = HIGH;
static unsigned long buttonDebounceTime = 0;

/**
 * Control the onboard status LED.
 * @param duration  0 = turn off, >0 = flash for duration ms, <0 = solid on
 */
void setIndicator(long duration) {
#ifdef CONFIG_IDF_TARGET_ESP32S3
	// ESP32-S3 Super Mini has no software-controllable LED
	(void)duration;
#else
	// ESP32-WROOM has simple GPIO LED
	if (duration == 0) {
		digitalWrite(ONBOARD_LED_PIN, LOW);
		indicatorOffTime = 0;
	} else if (duration > 0) {
		digitalWrite(ONBOARD_LED_PIN, HIGH);
		indicatorOffTime = millis() + duration;
	} else {
		digitalWrite(ONBOARD_LED_PIN, HIGH);
		indicatorOffTime = 0;
	}
#endif
}

void setup() {
	Serial.begin(115200);
	delay(500);  // Wait for USB CDC

	Serial.println("\n\n=== RGFX BOOT ===");

	// Initialize onboard LED indicator
#ifdef CONFIG_IDF_TARGET_ESP32S3
	// ESP32-S3 Super Mini blue LED is battery charging indicator - not software controllable
	Serial.println("ESP32-S3 Super Mini detected");
#else
	Serial.println("ESP32 detected - using GPIO2 for status LED");
	pinMode(ONBOARD_LED_PIN, OUTPUT);
	digitalWrite(ONBOARD_LED_PIN, LOW);
#endif

	// Configure BOOT button for test mode toggle
	pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

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

	// Initialize NVS flash FIRST - required before WiFi, Preferences, or any NVS operations
	// This will format the NVS partition if it's empty (fresh flash) or corrupted
	esp_err_t nvsErr = nvs_flash_init();
	if (nvsErr == ESP_ERR_NVS_NO_FREE_PAGES || nvsErr == ESP_ERR_NVS_NEW_VERSION_FOUND ||
	    nvsErr == ESP_ERR_NVS_NOT_INITIALIZED) {
		log("NVS partition needs formatting, erasing...");
		nvs_flash_erase();
		nvsErr = nvs_flash_init();
	}
	if (nvsErr != ESP_OK) {
		log("ERROR: Failed to initialize NVS: " + String(esp_err_to_name(nvsErr)));
		// Try one more time with erase as last resort
		log("Attempting NVS recovery with full erase...");
		nvs_flash_erase();
		nvsErr = nvs_flash_init();
		if (nvsErr != ESP_OK) {
			log("CRITICAL: NVS initialization failed after erase: " + String(esp_err_to_name(nvsErr)));
		}
	}
	if (nvsErr == ESP_OK) {
		log("NVS flash initialized successfully");
	}

	// Initialize NVS configuration
	ConfigNVS::begin();

	// Initialize gamma LUT to linear (1:1) before any LED operations
	// Will be rebuilt when config is received from Hub
	rebuildGammaLUT();

	// Load saved LED config early so FastLED is initialized before WiFi connects
	if (ConfigNVS::hasLEDConfig()) {
		String savedConfig = ConfigNVS::loadLEDConfig();
		if (savedConfig.length() > 0) {
			handleDriverConfig(savedConfig);
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

	// Initialize FPS calculation timer to avoid incorrect first reading
	g_lastFpsCalcTime = millis();
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
		matrix = new (std::nothrow) Matrix(newWidth, newHeight, newLayout, firstDevice.reverse);
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
	// Process pending effect clear request from Core 0
	// Must happen on Core 1 to avoid cross-core FastLED.show() race condition
	if (pendingClearEffects.exchange(false)) {
		if (effectProcessor != nullptr && !g_configUpdateInProgress) {
			effectProcessor->clearEffects();
			log("Effects cleared (requested by Core 0)");
		}
	}

	// Process UDP FIRST - outside frame rate gate for lowest latency
	// This ensures UDP packets are processed immediately without waiting for frame timing
	// Pause UDP effect processing during OTA or pending restart
	bool isConnected = ConfigPortal::isWiFiConnected();
	if (isConnected && udpSetupDone && !otaInProgress && !pendingRestart) {
		processUDP();
	}

	// FPS calculation (update every second)
	// Note: g_frameCount is incremented only when effectProcessor->update() is called
	uint32_t now = millis();
	if (now - g_lastFpsCalcTime >= 1000) {
		g_currentFps = g_frameCount * 1000.0f / (now - g_lastFpsCalcTime);
		// Only update min/max after we have meaningful data (at least 10 FPS)
		// This avoids bogus values during startup before effect processor is running
		if (g_currentFps >= 10.0f) {
			if (g_currentFps < g_minFps) g_minFps = g_currentFps;
			if (g_currentFps > g_maxFps) g_maxFps = g_currentFps;
		}
		g_frameCount = 0;
		g_lastFpsCalcTime = now;
	}

	// Check WiFi connection state and update LEDs accordingly
	// Note: isConnected already declared at top of loop() for UDP processing
	String state = ConfigPortal::getStateName();

	// Onboard LED indicator: solid in AP mode, blink while connecting, flash on network events
	bool isApMode = (state == "ApMode" || state == "NotConfigured");
	bool isConnecting = (state == "Connecting");

	// Ensure LED is off when exiting connecting state
	if (wasConnecting && !isConnecting && !isApMode) {
		setIndicator(0);
	}
	wasConnecting = isConnecting;

	if (isApMode) {
		setIndicator(-1);  // Solid on
	} else if (isConnecting) {
		// Blink 500ms on, 500ms off while connecting
		bool ledOn = (millis() / 500) % 2 == 0;
		setIndicator(ledOn ? -1 : 0);
	} else {
		// Check for MQTT event from Core 0
		if (mqttEventReceived.exchange(false)) {
			setIndicator(INDICATOR_FLASH_MS);
		}
		// Auto-off after flash duration
		if (indicatorOffTime > 0 && millis() >= indicatorOffTime) {
			setIndicator(0);
		}
	}

	// Check if in AP mode (NotConfigured or ApMode states)
	static bool inApMode = false;
	bool nowInApMode = (state == "NotConfigured" || state == "ApMode");

	// Process serial commands ALWAYS (even during AP mode or connection attempts)
	// This allows wifi credentials to be set via serial at any time
	SerialCommand::process();

	// BOOT button: toggle test mode on press
	bool buttonState = digitalRead(BOOT_BUTTON_PIN);
	if (buttonState != lastButtonState && (millis() - buttonDebounceTime) >= BUTTON_DEBOUNCE_MS) {
		buttonDebounceTime = millis();
		lastButtonState = buttonState;
		if (buttonState == LOW) {
			testModeActive = !testModeActive;
			if (testModeActive) {
				log("Test mode ON (button)");
				publishTestState("on");
			} else {
				if (effectProcessor != nullptr) effectProcessor->clearEffects();
				log("Test mode OFF (button)");
				publishTestState("off");
			}
		}
	}

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
	// Skip effect processing during OTA, config update, or pending restart
	if (isConnected && udpSetupDone && !otaInProgress && !g_configUpdateInProgress && !pendingRestart) {
		// Create Matrix lazily when FastLED is ready (only happens once)
		createMatrixIfNeeded();

		// Initialize effect processor on first run (only if matrix is ready and valid)
		if (effectProcessor == nullptr && matrix != nullptr && matrix->isValid()) {
			effectProcessor = new (std::nothrow) EffectProcessor(*matrix, hal::getDisplay());
			if (!effectProcessor) {
				log("ERROR: Failed to allocate EffectProcessor");
			}
		}

		// Process one UDP message per frame to avoid heap fragmentation
		// from burst JSON alloc/free cycles (queue drains at frame rate)
		UDPMessage message;
		if (checkUDPMessage(&message) && effectProcessor != nullptr) {
			setIndicator(INDICATOR_FLASH_MS);
			effectProcessor->addEffect(String(message.effect), message.props);
		}

		// Update and render continuous effects
		if (effectProcessor != nullptr) {
			effectProcessor->update();
			g_frameCount++;
		}
	}

	// LED health auto-recovery: if LED output is broken for extended period, restart
	static uint32_t ledUnhealthySinceMs = 0;
	if (effectProcessor != nullptr && !getLedHealthy()) {
		if (ledUnhealthySinceMs == 0) {
			ledUnhealthySinceMs = millis();
			log("LED health: RMT output appears broken", LogLevel::ERROR);
		} else if (millis() - ledUnhealthySinceMs > 30000) {
			log("LED health: broken for 30s, restarting", LogLevel::ERROR);
			pendingRestart.store(true);
			delay(200);  // Allow log messages to be published by Core 0
			safeRestart();
		}
	} else {
		ledUnhealthySinceMs = 0;
	}

	// Respond to watchdog ping from Core 0 - MUST be outside conditional block
	// so Core 1 responds even when conditions above fail (e.g., no UDP, OTA in progress)
	if (watchdogPing.load()) {
		watchdogPing.store(false);
		watchdogPong.store(true);
	}

	// Update crash handler with current uptime (so we know uptime at crash)
	updateCrashUptime();

	// Yield to task scheduler (prevents watchdog timer issues)
	yield();
}
