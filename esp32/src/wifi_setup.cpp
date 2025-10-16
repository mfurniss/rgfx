#include "wifi_setup.h"
#include "log.h"

// WiFi credentials
const char* WIFI_SSID = "rme-guest";
const char* WIFI_PASSWORD = "soulmanstax57";

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
		log("WiFi connected!");
		log("IP address: " + WiFi.localIP().toString());

		// AFTER connection, disable power saving for low latency
		WiFi.setSleep(WIFI_PS_NONE);
		WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Max power
		log("WiFi power saving DISABLED for low latency");
	} else {
		log("WiFi connection failed - continuing without network");
	}
}
