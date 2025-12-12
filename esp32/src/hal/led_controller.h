/**
 * LED Controller Interface
 *
 * Abstracts FastLED controller operations so the same code can run on:
 *   - ESP32 (real FastLED with hardware LEDs)
 *   - Native simulator (raylib display)
 *   - Tests (headless)
 *
 * Note: FastLED.addLeds<>() is not abstracted - it's a template function
 * that requires hardware-specific configuration and only runs on ESP32.
 */
#pragma once

#include <cstdint>

namespace hal {

class ILedController {
   public:
	virtual ~ILedController() = default;

	/**
	 * Display the LED buffer
	 * ESP32: calls FastLED.show()
	 * Native: no-op (display handled by IDisplay)
	 */
	virtual void show() = 0;

	/**
	 * Clear all LEDs to black
	 * @param writeData If true, immediately push to hardware
	 */
	virtual void clear(bool writeData = false) = 0;

	/**
	 * Set global brightness (0-255)
	 */
	virtual void setBrightness(uint8_t brightness) = 0;

	/**
	 * Set maximum power limit (ESP32-only, no-op elsewhere)
	 */
	virtual void setMaxPower(uint8_t volts, uint32_t milliamps) {
		(void)volts;
		(void)milliamps;
	}

	/**
	 * Enable/disable temporal dithering (ESP32-only, no-op elsewhere)
	 */
	virtual void setDither(bool enabled) { (void)enabled; }
};

/**
 * Get the platform-specific LED controller instance
 */
ILedController& getLedController();

}  // namespace hal
