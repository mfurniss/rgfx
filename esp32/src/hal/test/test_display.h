/**
 * Test Display Header
 *
 * Exposes HeadlessDisplay for use in unit tests.
 */
#pragma once

#include "hal/display.h"
#include <vector>

namespace hal {
namespace test {

/**
 * Headless display that captures frames for assertions in unit tests.
 */
class HeadlessDisplay : public IDisplay {
   public:
	HeadlessDisplay() = default;

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override;
	void setBrightness(uint8_t brightness) override;
	bool shouldQuit() override { return false; }

	// Test helpers
	const std::vector<CRGB>& getLastFrame() const { return lastFrame_; }
	uint32_t getFrameCount() const { return frameCount_; }
	uint8_t getBrightness() const { return brightness_; }

	void reset() {
		lastFrame_.clear();
		frameCount_ = 0;
	}

   private:
	std::vector<CRGB> lastFrame_;
	uint8_t brightness_ = 255;
	uint32_t frameCount_ = 0;
};

}  // namespace test
}  // namespace hal
