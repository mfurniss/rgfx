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
	// Note: WiFi connection happens asynchronously in IotWebConf's doLoop()
	ConfigPortal::begin();
}

// Track WiFi connection state
static bool wasConnected = false;
static bool udpSetupDone = false;
static bool initialConnectionAttemptDone = false;

void loop() {
	// Process config portal web requests (MUST be called in loop)
	ConfigPortal::process();

	// Check WiFi connection state and update LEDs accordingly
	bool isConnected = ConfigPortal::isWiFiConnected();

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
			// Just connected - setup UDP and show GREEN briefly
			log("WiFi connected - setting up UDP");
			fill_solid(matrix.leds, matrix.size, CRGB::Green);
			FastLED.show();
			delay(500);

			setupUDP();
			udpSetupDone = true;

			// Go dark for normal operation
			fill_solid(matrix.leds, matrix.size, CRGB::Black);
			FastLED.show();
		} else {
			// Disconnected or failed to connect - show PURPLE (AP mode)
			log("WiFi not connected - entering AP mode");
			fill_solid(matrix.leds, matrix.size, CRGB::Purple);
			FastLED.show();
			udpSetupDone = false;
		}
	}

	// Check for serial commands (for debugging)
	if (Serial.available()) {
		String cmd = Serial.readStringUntil('\n');
		cmd.trim();
		if (cmd == "factory_reset") {
			log("Factory reset: Erasing WiFi credentials and rebooting...");
			ConfigPortal::resetSettings();
			delay(1000);
			ESP.restart();
		}
	}

	// Only process UDP if WiFi is connected and UDP is set up
	if (isConnected && udpSetupDone) {
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
	}

	// Yield to task scheduler (prevents watchdog timer issues)
	delay(1);
}
