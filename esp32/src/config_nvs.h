#ifndef CONFIG_NVS_H
#define CONFIG_NVS_H

#include <Arduino.h>

/**
 * NVS (Non-Volatile Storage) configuration manager
 *
 * Stores LED configuration received from Hub for persistence across reboots.
 * Allows drivers to work with saved config even if Hub is offline.
 *
 * Features:
 * - WiFi credentials (managed by IotWebConf, stored separately)
 * - LED configuration (stored as JSON string)
 * - Config validation on load
 *
 * Usage:
 *   ConfigNVS::begin();              // Call once in setup()
 *   ConfigNVS::saveLEDConfig(json);  // Save config from MQTT
 *   String config = ConfigNVS::loadLEDConfig();  // Load on boot
 */
class ConfigNVS {
  public:
	/**
	 * Initialize NVS
	 *
	 * Call this once in setup().
	 */
	static void begin();

	/**
	 * Clear all NVS configuration (factory reset)
	 *
	 * Removes all stored settings including LED config.
	 * Does NOT clear WiFi credentials (managed by IotWebConf).
	 */
	static void factoryReset();

	/**
	 * Save LED configuration to NVS
	 *
	 * @param configJson - JSON string of LED configuration
	 * @return true if saved successfully, false on error
	 */
	static bool saveLEDConfig(const String& configJson);

	/**
	 * Load LED configuration from NVS
	 *
	 * @return JSON string of LED configuration, or empty string if not found
	 */
	static String loadLEDConfig();

	/**
	 * Check if LED configuration exists in NVS
	 *
	 * @return true if config exists, false otherwise
	 */
	static bool hasLEDConfig();

	/**
	 * Clear LED configuration from NVS
	 *
	 * Removes stored LED config but keeps other settings.
	 */
	static void clearLEDConfig();

  private:
	// NVS namespace name (max 15 characters)
	static constexpr const char* NAMESPACE = "rgfx";

	// NVS keys
	static constexpr const char* KEY_LED_CONFIG = "led_config";
};

#endif
