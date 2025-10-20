#include "config_portal.h"
#include "log.h"
#include <WiFi.h>

// ESP_WiFiManager - must include Impl in only ONE file
#include <ESP_WiFiManager.h>
#include <ESP_WiFiManager-Impl.h>

// WiFiManager instance (pointer to avoid global constructor issues)
static ESP_WiFiManager* wifiManager = nullptr;

#define PORTAL_TIMEOUT 120  // Config portal timeout (seconds)

// Generate unique AP name based on MAC address
String generateAPName() {
	uint8_t mac[6];
	WiFi.macAddress(mac);

	// Use last 2 bytes of MAC to generate 4 random-looking characters
	char suffix[5];
	sprintf(suffix, "%02x%02x", mac[4], mac[5]);

	String apName = "rgfx-node-";
	apName += suffix;
	apName.toLowerCase();

	return apName;
}

bool ConfigPortal::begin() {
	log("Starting Config Portal...");
	Serial.flush();

	// Create WiFiManager instance if not already created
	if (!wifiManager) {
		log("Creating WiFiManager instance...");
		Serial.flush();
		wifiManager = new ESP_WiFiManager();
	}

	// Initialize WiFi in station mode
	log("Setting WiFi mode...");
	Serial.flush();
	WiFi.mode(WIFI_STA);
	delay(100);

	// Generate unique AP name
	log("Generating AP name...");
	Serial.flush();
	String apName = generateAPName();
	log("AP Name: " + apName);
	Serial.flush();

	// Set device hostname
	log("Setting hostname...");
	Serial.flush();
	WiFi.setHostname(apName.c_str());

	// Set timeout for config portal
	log("Setting portal timeout...");
	Serial.flush();
	wifiManager->setConfigPortalTimeout(PORTAL_TIMEOUT);

	// Attempt to auto-connect to saved WiFi
	// If it fails, it will start a config portal AP with unique name
	log("Calling autoConnect...");
	Serial.flush();
	bool connected = wifiManager->autoConnect(apName.c_str());
	log("autoConnect returned: " + String(connected));
	Serial.flush();

	if (connected) {
		log("WiFi connected to: " + WiFi.SSID());
		log("IP address: " + WiFi.localIP().toString());

		// Disable power saving for low latency
		// WiFi.setSleep(WIFI_PS_NONE);
		// WiFi.setTxPower(WIFI_POWER_19_5dBm);
		log("WiFi power saving DISABLED for low latency");

		// Start web portal on local network IP for remote configuration
		// log("Starting web portal on local IP...");
		// wifiManager->startConfigPortal();
		// log("Web portal running at: http://" + WiFi.localIP().toString() + "/");

		return true;
	} else {
		log("WiFi connection failed or portal timeout");
		return false;
	}
}

void ConfigPortal::openPortal() {
	if (!wifiManager) {
		wifiManager = new ESP_WiFiManager();
	}
	String apName = generateAPName();
	log("Opening config portal: " + apName);
	wifiManager->startConfigPortal(apName.c_str());
}

void ConfigPortal::resetSettings() {
	log("Factory reset: Erasing WiFi credentials...");
	if (wifiManager) {
		wifiManager->resetSettings();
	}
}

bool ConfigPortal::isWiFiConnected() {
	return WiFi.status() == WL_CONNECTED;
}

String ConfigPortal::getWiFiStatus() {
	if (isWiFiConnected()) {
		return "Connected to " + WiFi.SSID() + " (" + WiFi.localIP().toString() + ")";
	} else {
		return "Disconnected";
	}
}

// NOTE: ConfigPortal::openPortal() implementation is in main.cpp
