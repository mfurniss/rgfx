/**
 * Test Display Implementation
 *
 * Headless display that captures frames for assertions in unit tests.
 */
#include "hal/test/test_display.h"

namespace hal {
namespace test {

void HeadlessDisplay::show(const CRGB* pixels, uint32_t count, uint16_t /*width*/, uint16_t /*height*/) {
	// Store a copy of the last frame
	lastFrame_.assign(pixels, pixels + count);
	frameCount_++;
}

void HeadlessDisplay::setBrightness(uint8_t brightness) {
	brightness_ = brightness;
}

}  // namespace test

#ifndef HAL_TEST_DISPLAY_NO_GLOBAL
// Global accessor returns a static instance
static test::HeadlessDisplay g_testDisplay;

IDisplay& getDisplay() {
	return g_testDisplay;
}
#endif

}  // namespace hal
