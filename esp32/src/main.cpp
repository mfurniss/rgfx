#include <FastLED.h>
#include "matrix.h"
#include "fire.h"
#include "wave.h"
#include "sparkle.h"
#include "mqtt.h"

#define LED_PIN     16  // RX2 = GPIO16
#define BRIGHTNESS  64  // 25% brightness
#define FLASH_DURATION_MS  10  // MQTT message flash duration

Matrix matrix(WIDTH, HEIGHT);

void setup() {
	Serial.begin(115200);
	delay(1000);
	Serial.println("\n\nESP32 LED Matrix starting...");

	Serial.print("Matrix size: ");
	Serial.println(matrix.size);
	Serial.print("LED Pin: ");
	Serial.println(LED_PIN);
	Serial.print("Brightness: ");
	Serial.println(BRIGHTNESS);

	FastLED.addLeds<WS2812B, LED_PIN, GRB>(matrix.leds, matrix.size);
	FastLED.setMaxPowerInVoltsAndMilliamps(5, 300);
	FastLED.setBrightness(BRIGHTNESS);
	FastLED.setCorrection(TypicalPixelString);

	// Show BLUE while booting and waiting for WiFi
	Serial.println("Booting... Showing BLUE");
	fill_solid(matrix.leds, matrix.size, CRGB::Blue);
	FastLED.show();

	// Connect to WiFi and setup UDP (with 5 second timeout)
	setupWiFi();

	// If WiFi connected, show green
	if (WiFi.status() == WL_CONNECTED) {
		Serial.println("WiFi connected! Showing GREEN");
		fill_solid(matrix.leds, matrix.size, CRGB::Green);
		FastLED.show();
	} else {
		Serial.println("WiFi failed. Showing RED");
		fill_solid(matrix.leds, matrix.size, CRGB::Red);
		FastLED.show();
	}

	// MQTT DISABLED FOR UDP TESTING
	// setupMQTT();
	setupUDP();

	// Turn LEDs dark after UDP setup
	Serial.println("UDP ready - LEDs going DARK");
	fill_solid(matrix.leds, matrix.size, CRGB::Black);
	FastLED.show();
}

// Effect control variables (defined here, declared as extern in mqtt.h)
Effect currentEffect = SPARKLE;
uint32_t lastSwitchTime = 0;
const uint32_t effectDuration = 30 * 1000;
bool autoSwitch = true;
bool powerOn = true;
uint8_t currentBrightness = BRIGHTNESS;

void loop() {
	// MQTT DISABLED FOR UDP TESTING
	// mqttLoop();

	// Process incoming UDP packets
	processUDP();

	// Check for UDP color updates
	uint32_t color;
	if (checkUDPColor(&color)) {
		fill_solid(matrix.leds, matrix.size, color);
	}

	// Fade to black for flash effect
	fadeToBlackBy(matrix.leds, matrix.size, 50);
	FastLED.show();

	// Small delay
	delay(1);
}
