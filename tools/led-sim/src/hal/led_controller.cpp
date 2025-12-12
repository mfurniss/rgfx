/**
 * Native LED Controller Implementation
 *
 * No-op implementation for the LED simulator.
 * Display is handled by SimDisplay (hal::IDisplay).
 */
#include "hal/led_controller.h"
#include "hal/display.h"

namespace hal {

class NullLedController : public ILedController {
   public:
	void show() override {
		// No-op: Display is handled by hal::IDisplay
	}

	void clear(bool writeData) override {
		(void)writeData;
		// No-op: Buffer clearing handled by fill_solid in effect code
	}

	void setBrightness(uint8_t brightness) override {
		// Forward to display for visual feedback
		getDisplay().setBrightness(brightness);
	}

	// setMaxPower and setDither use default no-op implementations
};

// Global instance
static NullLedController g_ledController;

ILedController& getLedController() {
	return g_ledController;
}

}  // namespace hal
