/**
 * ESP32 FastLED Controller Implementation
 *
 * Wraps FastLED global object for the HAL interface.
 */
#include "hal/led_controller.h"
#include <FastLED.h>

namespace hal {

class FastLEDController : public ILedController {
   public:
	void show() override { FastLED.show(); }

	void clear(bool writeData) override { FastLED.clear(writeData); }

	void setBrightness(uint8_t brightness) override { FastLED.setBrightness(brightness); }

	void setMaxPower(uint8_t volts, uint32_t milliamps) override {
		FastLED.setMaxPowerInVoltsAndMilliamps(volts, milliamps);
	}

	void setDither(bool enabled) override { FastLED.setDither(enabled ? 1 : 0); }
};

// Global instance
static FastLEDController g_ledController;

ILedController& getLedController() {
	return g_ledController;
}

}  // namespace hal
