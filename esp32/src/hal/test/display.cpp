/**
 * Test Display Implementation
 *
 * Headless display that captures frames for assertions in unit tests.
 */
#include "hal/display.h"
#include <vector>

namespace hal {

class HeadlessDisplay : public IDisplay {
   public:
	HeadlessDisplay() : brightness_(255), frameCount_(0) {}

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override {
		// Store a copy of the last frame
		lastFrame_.assign(pixels, pixels + count);
		lastWidth_ = width;
		lastHeight_ = height;
		frameCount_++;
	}

	void setBrightness(uint8_t brightness) override { brightness_ = brightness; }

	bool shouldQuit() override { return false; }

	// Test helpers
	const std::vector<CRGB>& getLastFrame() const { return lastFrame_; }
	uint16_t getLastWidth() const { return lastWidth_; }
	uint16_t getLastHeight() const { return lastHeight_; }
	uint32_t getFrameCount() const { return frameCount_; }
	uint8_t getBrightness() const { return brightness_; }

	void reset() {
		lastFrame_.clear();
		lastWidth_ = 0;
		lastHeight_ = 0;
		frameCount_ = 0;
	}

   private:
	std::vector<CRGB> lastFrame_;
	uint16_t lastWidth_ = 0;
	uint16_t lastHeight_ = 0;
	uint8_t brightness_;
	uint32_t frameCount_;
};

}  // namespace hal
