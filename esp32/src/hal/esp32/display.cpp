/**
 * ESP32 FastLED Display Implementation
 *
 * Wraps FastLED.show() for the HAL display interface.
 * The actual LED buffer is managed by Matrix, this just triggers the display update.
 */
#include "hal/display.h"
#include <FastLED.h>

namespace hal {

class FastLEDDisplay : public IDisplay {
   public:
	FastLEDDisplay() : brightness_(255) {}

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override {
		(void)pixels;  // Buffer already set up by Matrix
		(void)count;
		(void)width;
		(void)height;
		FastLED.show();
	}

	void setBrightness(uint8_t brightness) override {
		brightness_ = brightness;
		FastLED.setBrightness(brightness);
	}

	bool shouldQuit() override {
		return false;  // ESP32 runs forever
	}

   private:
	uint8_t brightness_;
};

// Global display instance for ESP32
static FastLEDDisplay g_display;

IDisplay& getDisplay() {
	return g_display;
}

}  // namespace hal
