#include <FastLED.h>
#include <WiFi.h>
#include <map>
#include "matrix.h"
#include "effects/fire.h"
#include "effects/wave.h"
#include "effects/sparkle.h"
#include "effects/pulse.h"
#include "config_portal.h"
#include "udp.h"
#include "mqtt.h"
#include "log.h"

#define LED_PIN     16  // RX2 = GPIO16
#define BRIGHTNESS  64  // 25% brightness
#define FLASH_DURATION_MS  10  // MQTT message flash duration

Matrix matrix(WIDTH, HEIGHT);

// Effect function pointer type
typedef void (*EffectFunction)(Matrix&, uint32_t);

// Effect lookup table
std::map<String, EffectFunction> effectMap = {
	{"pulse", pulse}
	// Add more effects here
};

void setup() {
	Serial.begin(115200);
	delay(100);
	log("\n\nRGFX Node starting...");

	log("Matrix size: " + String(matrix.size));
	log("LED Pin: " + String(LED_PIN));
	log("Brightness: " + String(BRIGHTNESS));

	FastLED.addLeds<WS2812B, LED_PIN, GRB>(matrix.leds, matrix.size);
	FastLED.setMaxPowerInVoltsAndMilliamps(5, 300);
	FastLED.setBrightness(BRIGHTNESS);
	FastLED.setCorrection(TypicalPixelString);

	// Show BLUE while connecting to WiFi / in config portal
	log("Connecting to WiFi...");
	fill_solid(matrix.leds, matrix.size, CRGB::Blue);
	FastLED.show();

	// Start config portal and connect to WiFi
	bool wifiConnected = ConfigPortal::begin();

	// Show WiFi connection status with LEDs
	if (wifiConnected) {
		fill_solid(matrix.leds, matrix.size, CRGB::Green);
	} else {
		fill_solid(matrix.leds, matrix.size, CRGB::Red);
	}
	FastLED.show();

	// MQTT DISABLED FOR UDP TESTING
	// setupMQTT();
	setupUDP();

	// Turn LEDs dark after UDP setup
	log("UDP ready - LEDs going DARK");
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	FastLED.show();
}

void loop() {
	// Check for serial commands (for debugging)
	if (Serial.available()) {
		String cmd = Serial.readStringUntil('\n');
		cmd.trim();
		if (cmd == "factory_reset") {
			log("Factory reset: Erasing WiFi credentials and rebooting...");
			ConfigPortal::resetSettings();
			delay(1000);
			ESP.restart();
		} else if (cmd == "portal") {
			log("Opening config portal...");
			ConfigPortal::openPortal();
		}
	}

	// MQTT DISABLED FOR UDP TESTING
	// mqttLoop();

	// Process incoming UDP packets
	processUDP();

	// Check for UDP message updates
	UDPMessage message;
	if (checkUDPMessage(&message)) {
		// Look up effect in map and call it
		auto it = effectMap.find(message.effect);
		if (it != effectMap.end()) {
			it->second(matrix, message.color);
		}
	}

	// Fade to black for flash effect
	fadeToBlackBy(matrix.leds, matrix.size, 50);
	FastLED.show();

	// Yield to task scheduler (prevents watchdog timer issues)
	delay(1);
}
