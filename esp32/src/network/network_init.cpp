#include "network/network_init.h"
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include "config/config_leds.h"
#include "config/config_nvs.h"
#include "config/constants.h"
#include "driver_config.h"
#include "hal/led_controller.h"
#include "log.h"
#include "network/mqtt.h"
#include "network/ota_update.h"
#include "network/udp.h"
#include "utils.h"

// Forward declarations from main.cpp
void handleDriverConfig(const String& payload);
extern Matrix* matrix;

// WiFi TX power - maximum power for best range and reliability
static constexpr wifi_power_t WIFI_TX_POWER = WIFI_POWER_19_5dBm;

// WiFi event handler flag to track if registered
static bool wifiEventHandlerRegistered = false;

/**
 * WiFi event handler for clean state management
 *
 * Ensures MQTT client is properly disconnected when WiFi drops,
 * preventing stale connection state and socket leaks.
 */
static void onWiFiEvent(WiFiEvent_t event) {
	switch (event) {
		case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
			log("WiFi disconnected event - forcing MQTT disconnect");
			mqttClient.disconnect();
			break;
		case ARDUINO_EVENT_WIFI_STA_GOT_IP:
			log("WiFi connected event - IP: " + WiFi.localIP().toString());
			break;
		default:
			break;
	}
}

/**
 * Common network setup logic shared between overloads.
 * Sets up WiFi event handler, mDNS, OTA, loads LED config, and initializes MQTT/UDP.
 */
static void setupNetworkServicesCore() {
	// Register WiFi event handler once (for clean disconnect handling)
	if (!wifiEventHandlerRegistered) {
		WiFi.onEvent(onWiFiEvent);
		wifiEventHandlerRegistered = true;
		log("WiFi event handler registered");
	}

	// Disable WiFi power saving for low latency UDP
	WiFi.setSleep(WIFI_PS_NONE);
	WiFi.setTxPower(WIFI_TX_POWER);
	log("WiFi power saving disabled, TX power set to max");

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
	setupOTA();

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
}

/**
 * Common network cleanup logic shared between overloads.
 * Resets MQTT/UDP flags and broker discovery state.
 */
static void cleanupNetworkServicesCore() {
	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;

	// Reset MQTT broker discovery state to force fresh discovery on reconnect
	// This prevents stale broker IPs from causing repeated connection failures
	extern bool mqttServerDiscovered;
	extern char mqttServerIP[];
	mqttServerDiscovered = false;
	mqttServerIP[0] = '\0';
}

void setupNetworkServices(Matrix& m) {
	log("WiFi connected - setting up OTA, MQTT and UDP");
	fill_solid(m.leds, m.size, CRGB::Green);
	hal::getLedController().show();

	setupNetworkServicesCore();

	// Go dark for normal operation
	// NOTE: Use global matrix pointer, not the reference parameter, because
	// handleDriverConfig() may have deleted and recreated the matrix
	if (::matrix != nullptr && ::matrix->leds != nullptr) {
		fill_solid(::matrix->leds, ::matrix->size, CRGB::Black);
		hal::getLedController().show();
	}
}

void cleanupNetworkServices(Matrix& m) {
	log("WiFi not connected - entering AP mode");

	// Don't show purple LEDs if OTA or restart is in progress
	if (!otaInProgress && !pendingRestart) {
		fill_solid(m.leds, m.size, CRGB::Purple);
		hal::getLedController().show();
	}

	cleanupNetworkServicesCore();
}

// Overload without Matrix for when it's not ready
void setupNetworkServices() {
	log("WiFi connected - setting up OTA, MQTT and UDP (no LED feedback yet)");

	// Clear LEDs if matrix is available (e.g., after reset when purple LEDs remain lit)
	// Check both pointer and leds buffer, and ensure config update isn't in progress
	if (!g_configUpdateInProgress && matrix != nullptr && matrix->leds != nullptr) {
		fill_solid(matrix->leds, matrix->size, CRGB::Black);
		hal::getLedController().show();
	}

	setupNetworkServicesCore();
}

void cleanupNetworkServices() {
	log("WiFi not connected - entering AP mode (no LED feedback yet)");

	// Don't clear LEDs if OTA is in progress (green success indicator should stay)
	cleanupNetworkServicesCore();
}
