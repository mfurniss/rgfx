#ifndef CONFIG_NVS_H
#define CONFIG_NVS_H

#include <Arduino.h>

/**
 * NVS (Non-Volatile Storage) configuration manager
 *
 * Minimal storage for driver boot configuration.
 * LED hardware configuration is managed by the Hub and received via MQTT.
 *
 * Features:
 * - WiFi credentials (managed by IotWebConf, stored separately)
 * - Hub discovery information (future use)
 *
 * Usage:
 *   ConfigNVS::begin();  // Call once in setup()
 *
 * Note: LED configuration (brightness, pins, devices) is NOT stored here.
 * It is managed centrally by the Hub and pushed to drivers via MQTT.
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
	 * Removes all stored settings.
	 * Does NOT clear WiFi credentials (managed by IotWebConf).
	 */
	static void factoryReset();

  private:
	// NVS namespace name (max 15 characters)
	static constexpr const char* NAMESPACE = "rgfx";
};

#endif
