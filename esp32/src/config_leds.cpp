#include "config_leds.h"
#include "log.h"
#include <FastLED.h>

// LED configuration parameter storage
static char ledBrightnessValue[4] = "64";  // Default: 64 (25% of 255)
static char ledDataPinValue[3] = "16";     // Default: GPIO16

// Accessor functions
uint8_t ConfigLeds::getBrightness() {
	return (uint8_t)atoi(ledBrightnessValue);
}

uint8_t ConfigLeds::getDataPin() {
	return (uint8_t)atoi(ledDataPinValue);
}

void ConfigLeds::initLeds(Matrix& matrix) {
	uint8_t brightness = getBrightness();
	uint8_t dataPin = getDataPin();

	// Validate and apply defaults if corrupted
	if (brightness == 0 || brightness > 255) {
		log("WARNING: Invalid brightness value, using default 64");
		brightness = 64;
		strcpy(ledBrightnessValue, "64");
	}
	if (dataPin > 33) {
		log("WARNING: Invalid data pin value, using default 16");
		dataPin = 16;
		strcpy(ledDataPinValue, "16");
	}

	log("LED configuration:");
	log("  Matrix size: " + String(matrix.size));
	log("  Data Pin: " + String(dataPin));
	log("  Brightness: " + String(brightness));

	// Initialize FastLED with configured pin
	// NOTE: Pin number must match template parameter (hardcoded to 16)
	// Changing the data pin requires recompiling with matching template
	FastLED.addLeds<WS2812B, 16, GRB>(matrix.leds, matrix.size);
	FastLED.setMaxPowerInVoltsAndMilliamps(5, 300);
	FastLED.setBrightness(brightness);
	FastLED.setCorrection(TypicalPixelString);
}

void ConfigLeds::applyBrightness() {
	uint8_t brightness = getBrightness();

	// Validate brightness
	if (brightness == 0 || brightness > 255) {
		log("WARNING: Invalid brightness value, using 64");
		brightness = 64;
		strcpy(ledBrightnessValue, "64");
	}

	log("Applying brightness: " + String(brightness));
	FastLED.setBrightness(brightness);
}

// Pointers to parameter storage (for IotWebConf)
char* getLedBrightnessValuePtr() { return ledBrightnessValue; }
char* getLedDataPinValuePtr() { return ledDataPinValue; }
