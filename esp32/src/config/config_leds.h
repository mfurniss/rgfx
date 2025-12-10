#ifndef CONFIG_LEDS_H
#define CONFIG_LEDS_H

#include <FastLED.h>
#include "driver_config.h"
#include "config/constants.h"

/**
 * FastLED Configuration Manager
 *
 * Handles runtime initialization of FastLED based on Hub-provided configuration.
 * Supports multiple pins, multiple devices per pin, strips and matrices.
 *
 * Limitations:
 * - Maximum 4 GPIO pins supported (MAX_PINS in constants.h)
 * - All LEDs must use same chipset type (WS2812B)
 * - Color order can vary per device
 */

// Hardware limits defined in config/constants.h:
// - MAX_PINS: Maximum supported GPIO pins

/**
 * Initialize FastLED based on g_driverConfig
 *
 * This function:
 * - Reads the global driver configuration
 * - Allocates LED buffers for each pin
 * - Calls FastLED.addLeds() for each configured pin
 * - Sets brightness and other global settings
 *
 * @return true if initialization succeeded, false otherwise
 */
bool configLEDs();

/**
 * Get pointer to LED array for a specific device
 *
 * @param deviceId Device ID from config (e.g., "marquee")
 * @return Pointer to LED array, or nullptr if not found
 */
CRGB* getLEDsForDevice(const String& deviceId);

/**
 * Get LED count for a specific device
 *
 * @param deviceId Device ID from config
 * @return Number of LEDs, or 0 if not found
 */
uint16_t getLEDCountForDevice(const String& deviceId);

/**
 * Show all LEDs (calls FastLED.show())
 */
void showAllLEDs();

/**
 * Clear all LEDs to black
 */
void clearAllLEDs();

/**
 * Check if FastLED has been initialized
 * FastLED.addLeds() can only be called once per pin
 */
bool isFastLEDInitialized();

#endif
