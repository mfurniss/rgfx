#include "config_portal.h"
#include "config_leds.h"
#include "config_nvs.h"
#include "log.h"
#include "utils.h"
#include <IotWebConf.h>
#include <IotWebConfUsing.h>
#include <IotWebConfParameter.h>

// Local char buffers for IotWebConf parameters
// These bridge IotWebConf's string-based API with ConfigNVS's type-safe storage
static char ledBrightnessValue[4] = "64";  // Temporary buffer for web form
static char ledDataPinValue[3] = "16";     // Temporary buffer for web form

// IotWebConf configuration
#define CONFIG_VERSION "rgfx2"

// DNS server for captive portal
DNSServer dnsServer;

// Web server on port 80
WebServer server(80);

// IotWebConf instance
static IotWebConf* iotWebConf = nullptr;

// LED configuration parameters
static IotWebConfNumberParameter ledBrightnessParam = IotWebConfNumberParameter(
      "LED Brightness", "ledBrightness", ledBrightnessValue, 4,
      "64", "1-255", "min='1' max='255' step='1'"
    );
static IotWebConfNumberParameter ledDataPinParam = IotWebConfNumberParameter(
      "LED Data Pin", "ledDataPin", ledDataPinValue, 3,
      "16", "GPIO 0-33", "min='0' max='33' step='1'"
    );

// LED settings parameter group
static IotWebConfParameterGroup ledGroup = IotWebConfParameterGroup("ledSettings", "LED Settings");

// State name lookup table
static const char* STATE_NAMES[] = {
	"Boot",           // 0
	"NotConfigured",  // 1
	"ApMode",         // 2
	"Connecting",     // 3
	"OnLine",         // 4
	"OffLine"         // 5
};

// Helper to convert state enum to human-readable string
String stateToString(uint8_t state) {
	if (state < 6) {
		return STATE_NAMES[state];
	}
	return "Unknown(" + String(state) + ")";
}

// Callback when config is saved
void configSaved() {
	log("Configuration saved");

	// Parse LED parameters from char buffers and save to NVS
	uint8_t brightness = (uint8_t)atoi(ledBrightnessValue);
	uint8_t dataPin = (uint8_t)atoi(ledDataPinValue);

	ConfigNVS::setLedBrightness(brightness);
	ConfigNVS::setLedDataPin(dataPin);

	// Apply brightness changes immediately (no reboot required)
	ConfigLeds::applyBrightness();
}

// Callback when WiFi connects
void wifiConnected() {
	log("WiFi connected!");
	log("IP address: " + WiFi.localIP().toString());
	log("Config portal available at: http://" + WiFi.localIP().toString());
}

void ConfigPortal::begin() {
	log("Initializing config portal...");

	// Load current LED configuration from NVS into char buffers for web form
	snprintf(ledBrightnessValue, sizeof(ledBrightnessValue), "%d", ConfigNVS::getLedBrightness());
	snprintf(ledDataPinValue, sizeof(ledDataPinValue), "%d", ConfigNVS::getLedDataPin());

	log("Loaded LED config from NVS:");
	log("  Brightness: " + String(ledBrightnessValue));
	log("  Data Pin: " + String(ledDataPinValue));

	// Get unique device name (same as MQTT client ID)
	String apName = Utils::getDeviceName();
	log("AP name: " + apName);

	// Initialize IotWebConf with NO password (empty string = open AP)
	iotWebConf = new IotWebConf(
	  apName.c_str(),           // Thing name (AP SSID)
	  &dnsServer,                // DNS server
	  &server,                   // Web server
	  "",                        // Empty password = open AP
	  CONFIG_VERSION             // Config version
	);

	// Set callbacks
	iotWebConf->setConfigSavedCallback(&configSaved);
	iotWebConf->setWifiConnectionCallback(&wifiConnected);

	// Skip AP mode if we have saved credentials (go straight to connecting)
	iotWebConf->skipApStartup();

	// Set WiFi connection timeout to 10 seconds (faster than 30s default)
	iotWebConf->setWifiConnectionTimeoutMs(10000);

	// Add LED configuration parameters
	ledGroup.addItem(&ledBrightnessParam);
	ledGroup.addItem(&ledDataPinParam);
	iotWebConf->addParameterGroup(&ledGroup);

	// Initialize - this will connect to WiFi or start AP mode
	log("Starting IotWebConf...");

	boolean validConfig = iotWebConf->init();

	if (validConfig) {
		log("Valid configuration loaded");
	} else {
		log("No valid configuration - starting in AP mode");
		log("Connect to SSID: " + apName);
		log("AP Password: " + String(iotWebConf->getApPasswordParameter()->valueBuffer));
		log("Navigate to: http://192.168.4.1");
		log("IMPORTANT: Set an AP password in the web interface!");
	}

	// Set up web server handlers
	server.on("/", HTTP_GET, []() {
		if (iotWebConf->handleCaptivePortal()) {
			return;
		}
		String page = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
		page += "<title>RGFX Driver</title>";
		page += "<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;}</style>";
		page += "</head><body>";
		page += "<h1>RGFX Driver</h1>";
		page += "<p>Go to <a href='/config'>configuration page</a> to set up WiFi.</p>";
		page += "</body></html>";
		server.send(200, "text/html", page);
	});
	server.on("/config", []() {
		iotWebConf->handleConfig();
	});
	server.onNotFound([]() {
		iotWebConf->handleNotFound();
	});

	// Disable WiFi power saving for low latency
	WiFi.setSleep(WIFI_PS_NONE);
	WiFi.setTxPower(WIFI_POWER_19_5dBm);

	log("Config portal initialization complete");
	if (WiFi.status() == WL_CONNECTED) {
		log("WiFi connected to: " + WiFi.SSID());
		log("Portal accessible at: http://" + WiFi.localIP().toString());
	}
}

void ConfigPortal::process() {
	// Must be called in loop to handle web requests
	if (iotWebConf) {
		static uint8_t lastState = 255;
		uint8_t currentState = iotWebConf->getState();

		// Log state changes with readable names
		if (currentState != lastState && lastState != 255) {
			log("State: " + stateToString(lastState) + " -> " + stateToString(currentState));
		}
		lastState = currentState;

		iotWebConf->doLoop();
	}
}

bool ConfigPortal::isWiFiConnected() {
	// Only consider connected if we have a valid IP (not AP mode)
	return WiFi.status() == WL_CONNECTED && iotWebConf->getState() == iotwebconf::NetworkState::OnLine;
}

String ConfigPortal::getWiFiStatus() {
	if (WiFi.status() == WL_CONNECTED) {
		return "Connected to " + WiFi.SSID() + " (" + WiFi.localIP().toString() + ")";
	} else {
		return "Not connected - AP mode active";
	}
}

String ConfigPortal::getStateName() {
	if (iotWebConf) {
		return stateToString(iotWebConf->getState());
	}
	return "Uninitialized";
}

uint8_t ConfigPortal::getLedBrightness() {
	return ConfigLeds::getBrightness();
}

uint8_t ConfigPortal::getLedDataPin() {
	return ConfigLeds::getDataPin();
}

void ConfigPortal::resetSettings() {
	log("Factory reset: Erasing all configuration...");

	// Clear NVS configuration (LED settings)
	ConfigNVS::factoryReset();

	// Note: WiFi credentials are still managed by IotWebConf's EEPROM storage
	// To fully reset WiFi as well, the device would need to be re-flashed or
	// IotWebConf would need to be reset separately

	log("NVS configuration erased - restarting...");
	delay(1000);
	ESP.restart();
}
