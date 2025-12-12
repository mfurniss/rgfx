/**
 * Test LED Controller Implementation
 *
 * Headless implementation for unit tests.
 */
#include "hal/led_controller.h"

namespace hal {

class TestLedController : public ILedController {
   public:
	void show() override { showCount_++; }

	void clear(bool writeData) override {
		(void)writeData;
		clearCount_++;
	}

	void setBrightness(uint8_t brightness) override { brightness_ = brightness; }

	// Test helpers
	uint32_t getShowCount() const { return showCount_; }
	uint32_t getClearCount() const { return clearCount_; }
	uint8_t getBrightness() const { return brightness_; }

	void reset() {
		showCount_ = 0;
		clearCount_ = 0;
		brightness_ = 255;
	}

   private:
	uint32_t showCount_ = 0;
	uint32_t clearCount_ = 0;
	uint8_t brightness_ = 255;
};

// Global instance
static TestLedController g_ledController;

ILedController& getLedController() {
	return g_ledController;
}

}  // namespace hal
