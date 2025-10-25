#include "config_leds.h"
#include "config_nvs.h"
#include "log.h"
#include <FastLED.h>

// Accessor functions - now read from NVS instead of static char arrays
uint8_t ConfigLeds::getBrightness() {
	return ConfigNVS::getLedBrightness();
}

uint8_t ConfigLeds::getDataPin() {
	return ConfigNVS::getLedDataPin();
}

void ConfigLeds::initLeds(Matrix& matrix) {
	uint8_t brightness = getBrightness();
	uint8_t dataPin = getDataPin();

	// Values are already validated by ConfigNVS
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

	// Value is already validated by ConfigNVS
	log("Applying brightness: " + String(brightness));
	FastLED.setBrightness(brightness);
}
