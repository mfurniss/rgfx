/**
 * Display Backend Interface
 *
 * Abstracts the final LED output, allowing the same effect code to render to:
 *   - Physical LEDs via FastLED (ESP32)
 *   - Visual window via raylib (native simulator)
 *   - Headless frame capture (unit tests)
 */
#pragma once

#include "hal/types.h"
#include <cstdint>

namespace hal {

/**
 * Abstract display interface
 *
 * Implementations receive the final pixel buffer after effects have rendered
 * and present it to the appropriate output (hardware LEDs, screen, etc.)
 */
class IDisplay {
   public:
	virtual ~IDisplay() = default;

	/**
	 * Present the pixel buffer to the display
	 *
	 * @param pixels  Array of RGB pixels
	 * @param count   Total number of pixels
	 * @param width   Logical width (for matrix layouts)
	 * @param height  Logical height (for matrix layouts, 1 for strips)
	 */
	virtual void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) = 0;

	/**
	 * Set global brightness (0-255)
	 */
	virtual void setBrightness(uint8_t brightness) = 0;

	/**
	 * Check if display should close (native only)
	 * ESP32 always returns false
	 */
	virtual bool shouldQuit() { return false; }
};

/**
 * Get the platform-specific display instance
 * Implemented per-platform (esp32, native, test)
 */
IDisplay& getDisplay();

#ifdef NATIVE_BUILD
/**
 * Raylib-based display for native simulator
 * Renders LED pixels to a desktop window
 */
class RaylibDisplay : public IDisplay {
   public:
	RaylibDisplay(uint16_t ledWidth, uint16_t ledHeight, int ledSize = 20, int ledGap = 2,
	              int padding = 20);
	~RaylibDisplay();

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override;
	void setBrightness(uint8_t brightness) override;
	bool shouldQuit() override;

   private:
	uint16_t ledWidth_;
	uint16_t ledHeight_;
	int ledSize_;
	int ledGap_;
	int padding_;
	uint8_t brightness_;
};
#endif  // NATIVE_BUILD

}  // namespace hal
