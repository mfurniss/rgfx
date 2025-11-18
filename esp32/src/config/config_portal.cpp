#include "config_portal.h"
#include "config_nvs.h"
#include "config_timeout.h"
#include "constants.h"
#include "log.h"
#include "utils.h"
#include <IotWebConf.h>
#include <IotWebConfUsing.h>
#include <IotWebConfSettings.h>
#include <EEPROM.h>
#include "generated/html_status.h"

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

// Helper to replace template variables in HTML stored in PROGMEM
String replaceTemplate(const char* htmlTemplate, const String& key, const String& value) {
	String html = String(htmlTemplate);
	String placeholder = "{{" + key + "}}";
	html.replace(placeholder, value);
	return html;
}

// Helper to generate HTML table row
// Usage: tableRow("Property", "Value")
// Returns: "<tr><td>Property</td><td>Value</td></tr>"
inline String tableRow(const String& label, const String& value) {
	return "<tr><td>" + label + "</td><td>" + value + "</td></tr>";
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

// Validate that a configuration string contains only printable characters
bool ConfigPortal::isValidConfigString(const char* str, size_t maxLen) {
	if (!str) {
		return false;
	}

	size_t len = strlen(str);

	// Empty strings or strings exceeding max length are invalid
	if (len == 0 || len > maxLen) {
		return false;
	}

	// Check each character is printable ASCII (space through tilde: 0x20-0x7E)
	for (size_t i = 0; i < len; i++) {
		if (!isprint((unsigned char)str[i])) {
			return false;  // Non-printable character = corruption
		}
	}

	return true;
}

void ConfigPortal::begin() {
	log("Initializing config portal...");

	// Get unique device ID (same as MQTT client ID)
	String apName = Utils::getDeviceId();
	log("AP name: " + apName);

	// Initialize IotWebConf with a default AP password
	// IotWebConf REQUIRES an AP password to be set before it will connect to WiFi
	const char* defaultApPassword = "rgfx1234";     // Default password for AP mode
	iotWebConf = new IotWebConf(apName.c_str(),     // Thing name (AP SSID)
	                            &dnsServer,         // DNS server
	                            &server,            // Web server
	                            defaultApPassword,  // Default AP password (required!)
	                            CONFIG_VERSION      // Config version
	);

	// Set callbacks
	iotWebConf->setConfigSavedCallback(&configSaved);
	iotWebConf->setWifiConnectionCallback(&wifiConnected);

	// Disable status pin (used for reset detection)
	iotWebConf->setStatusPin(-1);

	// Disable the config button check by setting it to an unused pin
	iotWebConf->setConfigPin(-1);

	// Skip AP mode on startup if WiFi credentials are configured
	// This allows immediate WiFi connection instead of waiting 30 seconds in AP mode
	iotWebConf->skipApStartup();

	// Note: No LED config parameters added - config is managed by Hub

	// Initialize - this will connect to WiFi or start AP mode
	log("Starting IotWebConf...");

	boolean validConfig = iotWebConf->init();

	// Check for corrupted configuration data
	// IotWebConf loads values from EEPROM but doesn't validate them
	// Corrupted EEPROM can cause WiFi.softAP() to fail and trigger boot loop
	const char* thingName = iotWebConf->getThingName();
	const char* ssid =
		iotWebConf->getWifiSsidParameter() ? iotWebConf->getWifiSsidParameter()->valueBuffer : "";

	// Thing name can be empty (default state after factory reset) but if non-empty must be valid
	size_t thingNameLen = strlen(thingName);
	bool thingNameValid = (thingNameLen == 0) || isValidConfigString(thingName, 32);

	// SSID can be empty (default state before WiFi config) but if non-empty must be valid
	size_t ssidLen = strlen(ssid);
	bool ssidValid = (ssidLen == 0) || isValidConfigString(ssid, 32);

	if (!thingNameValid || !ssidValid) {
		log("ERROR: Corrupted configuration detected!");
		if (!thingNameValid) {
			log("  Thing name contains invalid characters (length: " + String(strlen(thingName)) +
			    ")");
		}
		if (!ssidValid) {
			log("  WiFi SSID contains invalid characters (length: " + String(ssidLen) + ")");
		}

		log("Performing automatic factory reset to clear corrupted EEPROM...");

		// Invalidate IotWebConf's EEPROM configuration by zeroing the config version
		// This forces IotWebConf to start with clean defaults on next init()
		EEPROM.begin(512);  // Initialize EEPROM with 512 bytes
		for (byte t = 0; t < IOTWEBCONF_CONFIG_VERSION_LENGTH; t++) {
			EEPROM.write(IOTWEBCONF_CONFIG_START + t, 0);
		}
		EEPROM.commit();
		EEPROM.end();

		log("EEPROM config version cleared. Restarting device...");
		delay(2000);
		ESP.restart();
	}

	if (validConfig) {
		// Skip AP mode entirely when WiFi credentials are already configured
		// This prevents the 10-second AP mode delay on subsequent boots
		iotWebConf->skipApStartup();
		log("Valid configuration loaded - skipping AP mode");
	} else {
		log("No valid configuration - starting in AP mode");
		log("Connect to SSID: " + apName);
		log("AP Password: " + String(iotWebConf->getApPasswordParameter()->valueBuffer));
		log("Navigate to: http://" + String(AP_IP_ADDRESS));
	}

	// Set up web server handlers
	server.on("/", HTTP_GET, []() {
		if (iotWebConf->handleCaptivePortal()) {
			return;
		}

		// Load HTML template from PROGMEM
		String page = String(HTML_STATUS);

		// Replace template variables
		page = replaceTemplate(page.c_str(), "DEVICE_NAME", Utils::getDeviceId());
		page = replaceTemplate(page.c_str(), "MAC_ADDRESS", WiFi.macAddress());
		page = replaceTemplate(page.c_str(), "UPTIME", String(millis() / 1000) + " seconds");
		// LED config now managed by Hub - these values are placeholders
		page = replaceTemplate(page.c_str(), "LED_BRIGHTNESS", "Hub Managed");
		page = replaceTemplate(page.c_str(), "LED_DATA_PIN", "Hub Managed");

		// Build network status rows dynamically
		String networkStatus;
		if (WiFi.status() == WL_CONNECTED) {
			networkStatus += tableRow("WiFi Status", "Connected");
			networkStatus += tableRow("SSID", WiFi.SSID());
			networkStatus += tableRow("IP Address", WiFi.localIP().toString());
			networkStatus += tableRow("Signal Strength", String(WiFi.RSSI()) + " dBm");
		} else {
			networkStatus += tableRow("WiFi Status", "Not Connected (AP Mode)");
			networkStatus += tableRow("AP IP", String(AP_IP_ADDRESS));
		}
		page = replaceTemplate(page.c_str(), "NETWORK_STATUS", networkStatus);

		server.send(200, "text/html", page);
	});

	server.on("/config", []() { iotWebConf->handleConfig(); });

	server.onNotFound([]() { iotWebConf->handleNotFound(); });

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
	return WiFi.status() == WL_CONNECTED &&
	       iotWebConf->getState() == iotwebconf::NetworkState::OnLine;
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
	// LED config now managed by Hub
	return 64;  // Default value for status display
}

uint8_t ConfigPortal::getLedDataPin() {
	// LED config now managed by Hub
	return 16;  // Default value for status display
}

void ConfigPortal::resetSettings() {
	log("Factory reset: Erasing all configuration...");

	// Clear NVS configuration (LED config, etc.)
	ConfigNVS::factoryReset();

	// Clear IotWebConf EEPROM storage (WiFi credentials, AP settings)
	// Invalidate the config version to force clean initialization
	log("Clearing IotWebConf EEPROM storage...");
	EEPROM.begin(512);
	for (byte t = 0; t < IOTWEBCONF_CONFIG_VERSION_LENGTH; t++) {
		EEPROM.write(IOTWEBCONF_CONFIG_START + t, 0);
	}
	EEPROM.commit();
	EEPROM.end();

	log("All configuration erased (NVS + EEPROM) - restarting...");
	delay(1000);
	ESP.restart();
}

bool ConfigPortal::setWiFiCredentials(const String& ssid, const String& password) {
	if (!iotWebConf) {
		log("ERROR: IotWebConf not initialized");
		return false;
	}

	log("Setting WiFi credentials via serial...");
	log("SSID: " + ssid);
	log("Password: " + String(password.length() > 0 ? "***" : "(empty)"));

	// Get the WiFi SSID and password parameters from IotWebConf
	iotwebconf::TextParameter* ssidParam =
		(iotwebconf::TextParameter*)iotWebConf->getWifiSsidParameter();
	iotwebconf::PasswordParameter* wifiPassParam =
		(iotwebconf::PasswordParameter*)iotWebConf->getWifiPasswordParameter();
	iotwebconf::PasswordParameter* apPassParam =
		(iotwebconf::PasswordParameter*)iotWebConf->getApPasswordParameter();

	if (!ssidParam || !wifiPassParam || !apPassParam) {
		log("ERROR: Could not get parameter objects");
		return false;
	}

	// Update WiFi SSID and password
	strncpy(ssidParam->valueBuffer, ssid.c_str(), ssidParam->getLength());
	ssidParam->valueBuffer[ssidParam->getLength() - 1] = '\0';  // Ensure null termination

	strncpy(wifiPassParam->valueBuffer, password.c_str(), wifiPassParam->getLength());
	wifiPassParam->valueBuffer[wifiPassParam->getLength() - 1] = '\0';  // Ensure null termination

	// Set AP password to the default (required for IotWebConf to connect to WiFi)
	const char* defaultApPassword = "rgfx1234";
	strncpy(apPassParam->valueBuffer, defaultApPassword, apPassParam->getLength());
	apPassParam->valueBuffer[apPassParam->getLength() - 1] = '\0';  // Ensure null termination

	log("Also setting AP password to: rgfx1234");

	// Save configuration to EEPROM
	iotWebConf->saveConfig();

	log("WiFi credentials saved successfully");
	log("Restart device to connect to WiFi");

	return true;
}
