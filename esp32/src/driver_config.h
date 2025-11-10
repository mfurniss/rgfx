#ifndef DRIVER_CONFIG_H
#define DRIVER_CONFIG_H

#include <Arduino.h>
#include <vector>

/**
 * LED Device Configuration (received from Hub via MQTT)
 *
 * This structure holds the configuration for a single LED device
 * as received from the RGFX Hub. Multiple devices can exist per driver.
 */
struct LEDDeviceConfig {
	String id;              // Device ID (e.g., "marquee", "coin_slot")
	String name;            // Display name
	uint8_t pin;            // GPIO pin number
	String layout;          // "strip" or "matrix-tl-h-snake", etc.
	uint16_t count;         // Number of LEDs
	uint16_t offset;        // Offset on pin (for multiple devices per pin)
	String chipset;          // "WS2812B", "WS2811", etc.
	String colorOrder;       // "GRB", "RGB", etc.
	uint8_t maxBrightness;   // 0-255 brightness limit
	String colorCorrection;  // "TypicalLEDStrip", "Typical8mmPixel", "UncorrectedColor"

	// Matrix-specific fields
	uint8_t width;   // Matrix width (0 if not a matrix)
	uint8_t height;  // Matrix height (0 if not a matrix)

	// Constructor with defaults
	LEDDeviceConfig() : pin(0), count(0), offset(0), maxBrightness(255), width(0), height(0) {}
};

/**
 * Global Driver Configuration (received from Hub)
 *
 * This is the complete configuration for this driver instance.
 * It includes all LED devices and global settings.
 */
struct DriverConfigData {
	String name;                           // Config name (e.g., "8x8 Matrix")
	String description;                    // Config description
	String version;                        // Config version
	std::vector<LEDDeviceConfig> devices;  // All LED devices

	// Global settings
	uint8_t globalBrightnessLimit;  // Global brightness cap
	bool dithering;                 // Enable dithering
	uint8_t updateRate;             // Refresh rate in Hz
	uint8_t powerSupplyVolts;       // Power supply voltage
	uint16_t maxPowerMilliamps;     // Maximum power draw in milliamps

	// Constructor with defaults
	DriverConfigData()
		: globalBrightnessLimit(255), dithering(true), updateRate(120),
		  powerSupplyVolts(5), maxPowerMilliamps(2000) {}
};

/**
 * Global driver configuration instance
 * Set by MQTT config receiver, read by LED initialization
 */
extern DriverConfigData g_driverConfig;

/**
 * Flag indicating whether configuration has been received from Hub
 */
extern bool g_configReceived;

#endif
