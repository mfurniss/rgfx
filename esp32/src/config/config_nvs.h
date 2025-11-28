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

	/**
	 * Save device ID to NVS
	 *
	 * @param deviceId - Custom device ID (max 32 characters)
	 * @return true if saved successfully, false on error
	 */
	static bool saveDeviceId(const String& deviceId);

	/**
	 * Load device ID from NVS
	 *
	 * @return Device ID string, or empty string if not found
	 */
	static String loadDeviceId();

	/**
	 * Check if device ID exists in NVS
	 *
	 * @return true if device ID exists, false otherwise
	 */
	static bool hasDeviceId();

	/**
	 * Save remote logging level to NVS
	 *
	 * @param level - Logging level ("all", "errors", or "off")
	 * @return true if saved successfully, false on error
	 */
	static bool saveLoggingLevel(const String& level);

	/**
	 * Load remote logging level from NVS
	 *
	 * @return Logging level string, or "off" if not found
	 */
	static String loadLoggingLevel();

   private:
	// NVS namespace name (max 15 characters)
	static constexpr const char* NAMESPACE = "rgfx";

	// NVS keys
	static constexpr const char* KEY_LED_CONFIG = "led_config";
	static constexpr const char* KEY_DEVICE_ID = "device_id";
	static constexpr const char* KEY_LOG_LEVEL = "log_level";
};

#endif
