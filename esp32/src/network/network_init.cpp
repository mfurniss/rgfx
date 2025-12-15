#include "network/network_init.h"
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include "hal/led_controller.h"
#include "network/mqtt.h"
#include "network/ota_update.h"
#include "network/udp.h"
#include "oled/oled_display.h"
#include "utils.h"
#include "log.h"
#include "config/config_nvs.h"
#include "config/config_leds.h"
#include "driver_config.h"

// Forward declaration from main.cpp
void handleDriverConfig(const String& payload);

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

// Map dBm float value to wifi_power_t enum
static wifi_power_t dBmToWifiPower(float dBm) {
	if (dBm >= 19.5f) return WIFI_POWER_19_5dBm;
	if (dBm >= 19.0f) return WIFI_POWER_19dBm;
	if (dBm >= 18.5f) return WIFI_POWER_18_5dBm;
	if (dBm >= 17.0f) return WIFI_POWER_17dBm;
	if (dBm >= 15.0f) return WIFI_POWER_15dBm;
	if (dBm >= 13.0f) return WIFI_POWER_13dBm;
	if (dBm >= 11.0f) return WIFI_POWER_11dBm;
	if (dBm >= 8.5f) return WIFI_POWER_8_5dBm;
	if (dBm >= 7.0f) return WIFI_POWER_7dBm;
	if (dBm >= 5.0f) return WIFI_POWER_5dBm;
	return WIFI_POWER_2dBm;
}

void setupNetworkServices(Matrix& matrix) {
	log("WiFi connected - setting up OTA, MQTT and UDP");
	fill_solid(matrix.leds, matrix.size, CRGB::Green);
	hal::getLedController().show();

	// Register WiFi event handler once (for clean disconnect handling)
	if (!wifiEventHandlerRegistered) {
		WiFi.onEvent(onWiFiEvent);
		wifiEventHandlerRegistered = true;
		log("WiFi event handler registered");
	}

	// Disable WiFi power saving for low latency UDP
	WiFi.setSleep(WIFI_PS_NONE);
	wifi_power_t txPower = dBmToWifiPower(g_driverConfig.wifiTxPower);
	WiFi.setTxPower(txPower);
	log("WiFi power saving disabled, TX power: " + String(g_driverConfig.wifiTxPower, 1) + " dBm");

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

	// Update display to show connected status with actual MQTT status
	if (Display::isAvailable()) {
		Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(), mqttClient.connected(),
		                       Utils::getDeviceId());
	}

	// Go dark for normal operation
	// NOTE: Use global matrix pointer, not the reference parameter, because
	// handleDriverConfig() may have deleted and recreated the matrix
	extern Matrix* matrix;
	if (matrix != nullptr && matrix->leds != nullptr) {
		fill_solid(matrix->leds, matrix->size, CRGB::Black);
		hal::getLedController().show();
	}
}

void cleanupNetworkServices(Matrix& matrix) {
	log("WiFi not connected - entering AP mode");

	// Don't show purple LEDs if OTA is in progress (reset is imminent)
	if (!otaInProgress) {
		fill_solid(matrix.leds, matrix.size, CRGB::Purple);
		hal::getLedController().show();
	}

	// Update display to show AP mode
	if (Display::isAvailable()) {
		Display::showAPMode(Utils::getDeviceId());
	}

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

// Forward declaration of global matrix from main.cpp
extern Matrix* matrix;

// Overload without Matrix for when it's not ready
void setupNetworkServices() {
	log("WiFi connected - setting up OTA, MQTT and UDP (no LED feedback yet)");

	// Clear LEDs if matrix is available (e.g., after reset when purple LEDs remain lit)
	// Check both pointer and leds buffer, and ensure config update isn't in progress
	if (!g_configUpdateInProgress && matrix != nullptr && matrix->leds != nullptr) {
		fill_solid(matrix->leds, matrix->size, CRGB::Black);
		hal::getLedController().show();
	}

	// Register WiFi event handler once (for clean disconnect handling)
	if (!wifiEventHandlerRegistered) {
		WiFi.onEvent(onWiFiEvent);
		wifiEventHandlerRegistered = true;
		log("WiFi event handler registered");
	}

	// Disable WiFi power saving for low latency UDP
	WiFi.setSleep(WIFI_PS_NONE);
	wifi_power_t txPower = dBmToWifiPower(g_driverConfig.wifiTxPower);
	WiFi.setTxPower(txPower);
	log("WiFi power saving disabled, TX power: " + String(g_driverConfig.wifiTxPower, 1) + " dBm");

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
	setupOTA();

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
		Display::showConnected(WiFi.SSID(), WiFi.localIP().toString(), mqttClient.connected(),
		                       Utils::getDeviceId());
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

	// Reset MQTT broker discovery state to force fresh discovery on reconnect
	// This prevents stale broker IPs from causing repeated connection failures
	extern bool mqttServerDiscovered;
	extern char mqttServerIP[];
	mqttServerDiscovered = false;
	mqttServerIP[0] = '\0';
}
