#include "config_portal.h"
#include "config_leds.h"
#include "config_nvs.h"
#include "log.h"
#include "utils.h"
#include <IotWebConf.h>
#include <IotWebConfUsing.h>

// IotWebConf configuration
#define CONFIG_VERSION "rgfx3"  // Incremented version to force config update

// Network configuration
static constexpr uint16_t WEB_SERVER_PORT = 80;
static constexpr uint32_t WIFI_CONNECTION_TIMEOUT_MS = 10000;  // 10 seconds
static const char* AP_IP_ADDRESS = "192.168.4.1";

// DNS server for captive portal
DNSServer dnsServer;

// Web server on port 80
WebServer server(WEB_SERVER_PORT);

// IotWebConf instance
static IotWebConf* iotWebConf = nullptr;

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
	log("Configuration saved (WiFi settings only)");
	// Note: LED config is now managed by Hub, not saved locally
}

// Callback when WiFi connects
void wifiConnected() {
	log("WiFi connected!");
	log("IP address: " + WiFi.localIP().toString());
	log("Config portal available at: http://" + WiFi.localIP().toString());
}

void ConfigPortal::begin() {
	log("Initializing config portal...");

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
	iotWebConf->setWifiConnectionTimeoutMs(WIFI_CONNECTION_TIMEOUT_MS);

	// Note: No LED config parameters added - config is managed by Hub

	// Initialize - this will connect to WiFi or start AP mode
	log("Starting IotWebConf...");

	boolean validConfig = iotWebConf->init();

	if (validConfig) {
		log("Valid configuration loaded");
	} else {
		log("No valid configuration - starting in AP mode");
		log("Connect to SSID: " + apName);
		log("AP Password: " + String(iotWebConf->getApPasswordParameter()->valueBuffer));
		log("Navigate to: http://" + String(AP_IP_ADDRESS));
		log("IMPORTANT: Set an AP password in the web interface!");
	}

	// Set up web server handlers
	server.on("/", HTTP_GET, []() {
		if (iotWebConf->handleCaptivePortal()) {
			return;
		}
		String page = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
		page += "<title>RGFX Driver</title>";
		page += "<style>";
		page += "body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;}";
		page += "h1{color:#333;}";
		page += "table{border-collapse:collapse;width:100%;margin:20px 0;}";
		page += "th,td{border:1px solid #ddd;padding:12px;text-align:left;}";
		page += "th{background-color:#f2f2f2;font-weight:bold;}";
		page += ".notice{background:#fff3cd;border:1px solid #ffc107;padding:15px;margin:20px 0;border-radius:4px;}";
		page += "a{color:#007bff;text-decoration:none;}";
		page += "a:hover{text-decoration:underline;}";
		page += "</style>";
		page += "</head><body>";
		page += "<h1>RGFX Driver Status</h1>";

		page += "<div class='notice'>";
		page += "<strong>Note:</strong> LED hardware configuration is managed by the RGFX Hub. ";
		page += "This interface is for WiFi settings and diagnostics only.";
		page += "</div>";

		page += "<h2>System Information</h2>";
		page += "<table>";
		page += "<tr><th>Property</th><th>Value</th></tr>";
		page += "<tr><td>Device Name</td><td>" + Utils::getDeviceName() + "</td></tr>";
		page += "<tr><td>MAC Address</td><td>" + WiFi.macAddress() + "</td></tr>";
		page += "<tr><td>Firmware Version</td><td>RGFX v1.0</td></tr>";
		page += "<tr><td>Uptime</td><td>" + String(millis() / 1000) + " seconds</td></tr>";
		page += "</table>";

		page += "<h2>Network Status</h2>";
		page += "<table>";
		page += "<tr><th>Property</th><th>Value</th></tr>";
		if (WiFi.status() == WL_CONNECTED) {
			page += "<tr><td>WiFi Status</td><td>Connected</td></tr>";
			page += "<tr><td>SSID</td><td>" + WiFi.SSID() + "</td></tr>";
			page += "<tr><td>IP Address</td><td>" + WiFi.localIP().toString() + "</td></tr>";
			page += "<tr><td>Signal Strength</td><td>" + String(WiFi.RSSI()) + " dBm</td></tr>";
		} else {
			page += "<tr><td>WiFi Status</td><td>Not Connected (AP Mode)</td></tr>";
			page += "<tr><td>AP IP</td><td>" + String(AP_IP_ADDRESS) + "</td></tr>";
		}
		page += "</table>";

		page += "<h2>LED Configuration (Read-Only)</h2>";
		page += "<table>";
		page += "<tr><th>Property</th><th>Value</th></tr>";
		page += "<tr><td>Brightness</td><td>" + String(ConfigLeds::getBrightness()) + "</td></tr>";
		page += "<tr><td>Data Pin</td><td>GPIO " + String(ConfigLeds::getDataPin()) + "</td></tr>";
		page += "<tr><td>Config Source</td><td>RGFX Hub (via MQTT)</td></tr>";
		page += "</table>";

		page += "<p><a href='/config'>WiFi Configuration</a></p>";
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

	// Clear NVS configuration
	ConfigNVS::factoryReset();

	// Note: WiFi credentials are still managed by IotWebConf's EEPROM storage
	// To fully reset WiFi as well, the device would need to be re-flashed or
	// IotWebConf would need to be reset separately

	log("NVS configuration erased - restarting...");
	delay(1000);
	ESP.restart();
}
