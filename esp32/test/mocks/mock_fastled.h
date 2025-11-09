/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_FASTLED_H
#define MOCK_FASTLED_H

#ifdef UNIT_TEST

#include <cstdint>
#include <cstring>

/**
 * Mock CRGB structure for native testing
 * Represents an RGB color value
 */
struct CRGB {
	uint8_t r;
	uint8_t g;
	uint8_t b;

	CRGB() : r(0), g(0), b(0) {}
	CRGB(uint8_t red, uint8_t green, uint8_t blue) : r(red), g(green), b(blue) {}

	// Named colors
	static const CRGB Black;
	static const CRGB Red;
	static const CRGB Green;
	static const CRGB Blue;
	static const CRGB Yellow;
	static const CRGB Purple;
	static const CRGB White;
	static const CRGB Orange;
};

// Define named colors
inline const CRGB CRGB::Black = CRGB(0, 0, 0);
inline const CRGB CRGB::Red = CRGB(255, 0, 0);
inline const CRGB CRGB::Green = CRGB(0, 255, 0);
inline const CRGB CRGB::Blue = CRGB(0, 0, 255);
inline const CRGB CRGB::Yellow = CRGB(255, 255, 0);
inline const CRGB CRGB::Purple = CRGB(128, 0, 128);
inline const CRGB CRGB::White = CRGB(255, 255, 255);
inline const CRGB CRGB::Orange = CRGB(255, 165, 0);

/**
 * Mock FastLED class for native testing
 * Simulates LED control without actual hardware
 */
class CFastLED {
  public:
	template <typename LED_TYPE, uint8_t PIN, typename COLOR_ORDER>
	void addLeds(CRGB* leds, int count) {
		// Mock implementation - no-op
		(void)leds;
		(void)count;
	}

	void setBrightness(uint8_t brightness) {
		// Mock implementation - no-op
		(void)brightness;
	}

	void show() {
		// Mock implementation - no-op
	}

	void clear() {
		// Mock implementation - no-op
	}
};

// Global FastLED instance (mimics FastLED library)
static CFastLED FastLED;

// Mock fill_solid function
template <typename T>
inline void fill_solid(T* leds, int count, const CRGB& color) {
	for (int i = 0; i < count; i++) {
		leds[i] = color;
	}
}

// Mock LED controller types (for addLeds template)
struct WS2812B {};
struct GRB {};

#endif // UNIT_TEST
#endif // MOCK_FASTLED_H
