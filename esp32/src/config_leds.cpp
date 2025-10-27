#include "config_leds.h"
#include "log.h"
#include <FastLED.h>

// Default/fallback configuration until Hub config arrives via MQTT
static constexpr uint8_t DEFAULT_BRIGHTNESS = 64;
static constexpr uint8_t DEFAULT_DATA_PIN = 16;
static constexpr uint8_t DEFAULT_POWER_VOLTS = 5;
static constexpr uint16_t DEFAULT_POWER_MILLIAMPS = 300;

// Accessor functions - TODO: Read from Hub-provided config
uint8_t ConfigLeds::getBrightness() {
	// TODO: Return brightness from Hub config
	return DEFAULT_BRIGHTNESS;
}

uint8_t ConfigLeds::getDataPin() {
	// TODO: Return data pin from Hub config
	return DEFAULT_DATA_PIN;
}

void ConfigLeds::initLeds(Matrix& matrix) {
	uint8_t brightness = getBrightness();
	uint8_t dataPin = getDataPin();

	log("LED configuration (using defaults until Hub config received):");
	log("  Matrix size: " + String(matrix.size));
	log("  Data Pin: " + String(dataPin));
	log("  Brightness: " + String(brightness));

	// Initialize FastLED with configured pin
	// NOTE: Pin number must match template parameter (hardcoded to DEFAULT_DATA_PIN)
	// Changing the data pin requires recompiling with matching template
	FastLED.addLeds<WS2812B, DEFAULT_DATA_PIN, GRB>(matrix.leds, matrix.size);
	FastLED.setMaxPowerInVoltsAndMilliamps(DEFAULT_POWER_VOLTS, DEFAULT_POWER_MILLIAMPS);
	FastLED.setBrightness(brightness);
	FastLED.setCorrection(TypicalPixelString);
}
