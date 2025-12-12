/**
 * Simulator Display
 *
 * Renders LED pixels to a raylib window.
 * Uses Matrix coordinate map to translate from physical LED order to screen position.
 */
#pragma once

#include "hal/display.h"
#include <cstdint>

// Forward declaration to avoid including matrix.h (raylib conflicts)
class Matrix;

class SimDisplay : public hal::IDisplay {
   public:
	SimDisplay(uint16_t ledWidth, uint16_t ledHeight, int windowWidth, int windowHeight,
	           float ledSize, float ledGap);

	/**
	 * Connect to matrix for coordinate mapping (like FastLED.addLeds).
	 * Must be called before show() for correct serpentine rendering.
	 */
	void setMatrix(const Matrix* matrix);

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override;
	void setBrightness(uint8_t brightness) override;
	bool shouldQuit() override;

   private:
	uint16_t ledWidth_;
	uint16_t ledHeight_;
	int windowWidth_;
	int windowHeight_;
	float ledSize_;
	float ledGap_;
	float offsetX_;
	float offsetY_;
	uint8_t brightness_;
	const Matrix* matrix_;  // Reference for coordinate map access
};

/**
 * Initialize the global display instance.
 * Must be called before any code uses hal::getDisplay().
 */
void initDisplay(uint16_t ledWidth, uint16_t ledHeight, int windowWidth, int windowHeight,
                 float ledSize, float ledGap);

/**
 * Clean up the global display instance.
 */
void cleanupDisplay();
