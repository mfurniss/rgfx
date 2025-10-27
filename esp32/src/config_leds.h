#ifndef CONFIG_LEDS_H
#define CONFIG_LEDS_H

#include <Arduino.h>
#include "matrix.h"

// LED configuration and initialization
class ConfigLeds {
  public:
	// Get configured LED brightness (1-255)
	static uint8_t getBrightness();

	// Get configured LED data pin (GPIO number)
	static uint8_t getDataPin();

	// Initialize FastLED with configured parameters
	// Must be called after ConfigPortal::begin()
	static void initLeds(Matrix& matrix);
};

#endif
