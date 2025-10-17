#include "wifi_setup.h"
#include "log.h"
#include <map>

// WiFi credentials
const char* WIFI_SSID = "rme-guest";
const char* WIFI_PASSWORD = "soulmanstax57";

// WiFi status lookup table
static const std::map<wl_status_t, String> wifiStatusMap = {
	{WL_IDLE_STATUS, "Idle"},
	{WL_NO_SSID_AVAIL, "SSID not available"},
	{WL_SCAN_COMPLETED, "Scan completed"},
	{WL_CONNECTED, "Connected"},
	{WL_CONNECT_FAILED, "Connection failed"},
	{WL_CONNECTION_LOST, "Connection lost"},
	{WL_DISCONNECTED, "Disconnected"}
};

String getWiFiStatusString(wl_status_t status) {
	auto it = wifiStatusMap.find(status);
	if (it != wifiStatusMap.end()) {
		return it->second;
	}
	return "Unknown status";
}

// WiFi connection setup (non-blocking with timeout)
void setupWiFi() {
	log("");
	log("Connecting to WiFi: " + String(WIFI_SSID));

	WiFi.mode(WIFI_STA);
	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

	// Try to connect for 5 seconds max
	int attempts = 0;
	while (WiFi.status() != WL_CONNECTED && attempts < 10) {
		delay(500);
		Serial.print(".");
		attempts++;
	}

	log("");
	if (WiFi.status() == WL_CONNECTED) {
		log("WiFi connected to: " + WiFi.SSID());
		log("IP address: " + WiFi.localIP().toString());

		// AFTER connection, disable power saving for low latency
		WiFi.setSleep(WIFI_PS_NONE);
		WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Max power
		log("WiFi power saving DISABLED for low latency");
	} else {
		log("WiFi failed: " + getWiFiStatusString(WiFi.status()));
	}
}
