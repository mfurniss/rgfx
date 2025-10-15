#include <FastLED.h>
#include "matrix.h"
#include "fire.h"
#include "wave.h"
#include "sparkle.h"
#include "mqtt.h"

#define LED_PIN     16  // RX2 = GPIO16
#define BRIGHTNESS  64  // 25% brightness
#define FLASH_DURATION_MS  10  // MQTT message flash duration

const uint8_t font_A[7] = {
	0b01110,
	0b10001,
	0b10001,
	0b11111,
	0b10001,
	0b10001,
	0b10001
};

const uint8_t font_B[7] = {
	0b11110,
	0b10001,
	0b10001,
	0b11110,
	0b10001,
	0b10001,
	0b11110,
};

const uint8_t font_C[7] = {
	0b01110,
	0b10001,
	0b10000,
	0b10000,
	0b10000,
	0b10001,
	0b01110,
};

Matrix matrix(WIDTH, HEIGHT);


const uint8_t* const font[3] PROGMEM = {
	font_A,
	font_B,
	font_C
};

void drawChar(CRGB* leds, char c, int ox, int oy) {

	int char_index = c - 'A';
	const uint8_t* char_data = (const uint8_t*)pgm_read_ptr(&font[char_index]);

	for(int y = 0; y < 7; y++) {
		for(int x = 0; x < 5; x++) {
			if((char_data[y] >> (4 - x)) & 0x01) {
				leds[matrix.xy(x + ox, y + oy)] = CRGB::White;
			}
		}
	}
}


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

	// Connect to WiFi and setup MQTT (with 5 second timeout)
	setupWiFi();

	// If WiFi connected, show green (temporarily, until MQTT connects)
	if (WiFi.status() == WL_CONNECTED) {
		Serial.println("WiFi connected! Showing GREEN");
		fill_solid(matrix.leds, matrix.size, CRGB::Green);
		FastLED.show();
	} else {
		Serial.println("WiFi failed. Showing RED");
		fill_solid(matrix.leds, matrix.size, CRGB::Red);
		FastLED.show();
	}

	// Setup MQTT (will turn LEDs dark if it connects)
	setupMQTT();
}

// Effect control variables (defined here, declared as extern in mqtt.h)
Effect currentEffect = SPARKLE;
uint32_t lastSwitchTime = 0;
const uint32_t effectDuration = 30 * 1000;
bool autoSwitch = true;
bool powerOn = true;
uint8_t currentBrightness = BRIGHTNESS;

void loop() {
	// Process MQTT as fast as possible - tight loop with no delays
	mqttLoop();
}
