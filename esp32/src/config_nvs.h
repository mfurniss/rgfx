#ifndef CONFIG_NVS_H
#define CONFIG_NVS_H

#include <Arduino.h>

/**
 * NVS (Non-Volatile Storage) configuration manager
 *
 * Replaces EEPROM-based configuration storage with ESP32's native Preferences library.
 * Provides type-safe, reliable storage for LED and device configuration.
 *
 * Features:
 * - Automatic one-time migration from EEPROM on first boot
 * - Type-safe integer storage (no string conversions)
 * - Namespace isolation ("rgfx" namespace)
 * - Factory reset support
 *
 * Usage:
 *   ConfigNVS::begin();  // Call once in setup() before other config operations
 *   uint8_t brightness = ConfigNVS::getLedBrightness();
 *   ConfigNVS::setLedBrightness(128);
 */
class ConfigNVS {
public:
	/**
	 * Initialize NVS and perform EEPROM migration if needed
	 *
	 * Call this once in setup() before any other configuration operations.
	 * Automatically migrates LED settings from IotWebConf EEPROM storage
	 * on first boot after firmware update.
	 */
	static void begin();

	/**
	 * Get configured LED brightness (1-255)
	 *
	 * @return Brightness value (1-255), defaults to 64 if not set
	 */
	static uint8_t getLedBrightness();

	/**
	 * Set LED brightness (1-255)
	 *
	 * @param brightness Brightness value (1-255)
	 */
	static void setLedBrightness(uint8_t brightness);

	/**
	 * Get configured LED data pin (GPIO number)
	 *
	 * @return GPIO pin number (0-33), defaults to 16 if not set
	 */
	static uint8_t getLedDataPin();

	/**
	 * Set LED data pin (GPIO number)
	 *
	 * @param pin GPIO pin number (0-33)
	 */
	static void setLedDataPin(uint8_t pin);

	/**
	 * Clear all NVS configuration (factory reset)
	 *
	 * Removes all stored settings and resets to defaults.
	 * Does NOT clear WiFi credentials (managed by IotWebConf).
	 */
	static void factoryReset();

	/**
	 * Check if EEPROM migration has been completed
	 *
	 * @return true if migration already performed, false otherwise
	 */
	static bool hasMigrated();

private:
	// NVS namespace name (max 15 characters)
	static constexpr const char* NAMESPACE = "rgfx";

	// NVS key names (max 15 characters each)
	static constexpr const char* KEY_BRIGHTNESS = "brightness";
	static constexpr const char* KEY_DATA_PIN = "dataPin";
	static constexpr const char* KEY_MIGRATED = "migrated";

	// Default values
	static constexpr uint8_t DEFAULT_BRIGHTNESS = 64;
	static constexpr uint8_t DEFAULT_DATA_PIN = 16;

	/**
	 * Perform one-time migration from EEPROM to NVS
	 *
	 * Reads LED configuration from IotWebConf EEPROM storage and
	 * copies values to NVS. Only runs once on first boot after update.
	 */
	static void migrateFromEEPROM();
};

#endif
