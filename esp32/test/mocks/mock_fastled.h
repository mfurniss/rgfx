/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_FASTLED_H
#define MOCK_FASTLED_H

#ifdef UNIT_TEST

#include <cstdint>
#include <cstring>
#include <cstdlib>

/**
 * Mock CRGB structure for native testing
 * Represents an RGB color value with named color support matching FastLED
 */
struct CRGB {
	union {
		struct { uint8_t r, g, b; };
		uint8_t raw[3];
	};

	CRGB() : r(0), g(0), b(0) {}
	CRGB(uint8_t red, uint8_t green, uint8_t blue) : r(red), g(green), b(blue) {}

	// Implicit conversion from uint32_t (for named colors)
	CRGB(uint32_t colorcode) {
		r = (colorcode >> 16) & 0xFF;
		g = (colorcode >> 8) & 0xFF;
		b = colorcode & 0xFF;
	}

	bool operator==(const CRGB& other) const {
		return r == other.r && g == other.g && b == other.b;
	}

	// Named colors as static constants (matching FastLED's HTML color codes)
	static const uint32_t Black   = 0x000000;
	static const uint32_t Red     = 0xFF0000;
	static const uint32_t Green   = 0x008000;  // HTML green (not lime)
	static const uint32_t Blue    = 0x0000FF;
	static const uint32_t White   = 0xFFFFFF;
	static const uint32_t Yellow  = 0xFFFF00;
	static const uint32_t Cyan    = 0x00FFFF;
	static const uint32_t Magenta = 0xFF00FF;
	static const uint32_t Orange  = 0xFFA500;
	static const uint32_t Purple  = 0x800080;
	static const uint32_t Pink    = 0xFFC0CB;
	static const uint32_t Lime    = 0x00FF00;
	static const uint32_t Aqua    = 0x00FFFF;
	static const uint32_t Navy    = 0x000080;
	static const uint32_t Teal    = 0x008080;
	static const uint32_t Olive   = 0x808000;
	static const uint32_t Maroon  = 0x800000;
	static const uint32_t Silver  = 0xC0C0C0;
	static const uint32_t Gray    = 0x808080;
	static const uint32_t Grey    = 0x808080;
};

/**
 * Mock CHSV structure for HSV color manipulation
 */
struct CHSV {
	uint8_t hue;
	uint8_t sat;
	uint8_t val;

	CHSV() : hue(0), sat(0), val(0) {}
	CHSV(uint8_t h, uint8_t s, uint8_t v) : hue(h), sat(s), val(v) {}

	// Implicit conversion to CRGB (simplified HSV to RGB)
	operator CRGB() const {
		if (sat == 0) {
			return CRGB(val, val, val);
		}

		uint8_t region = hue / 43;
		uint8_t remainder = (hue - (region * 43)) * 6;

		uint8_t p = (val * (255 - sat)) >> 8;
		uint8_t q = (val * (255 - ((sat * remainder) >> 8))) >> 8;
		uint8_t t = (val * (255 - ((sat * (255 - remainder)) >> 8))) >> 8;

		switch (region) {
			case 0:  return CRGB(val, t, p);
			case 1:  return CRGB(q, val, p);
			case 2:  return CRGB(p, val, t);
			case 3:  return CRGB(p, q, val);
			case 4:  return CRGB(t, p, val);
			default: return CRGB(val, p, q);
		}
	}
};

/**
 * Mock rgb2hsv_approximate - converts RGB to HSV
 */
inline CHSV rgb2hsv_approximate(const CRGB& rgb) {
	uint8_t maxVal = rgb.r > rgb.g ? (rgb.r > rgb.b ? rgb.r : rgb.b) : (rgb.g > rgb.b ? rgb.g : rgb.b);
	uint8_t minVal = rgb.r < rgb.g ? (rgb.r < rgb.b ? rgb.r : rgb.b) : (rgb.g < rgb.b ? rgb.g : rgb.b);

	CHSV hsv;
	hsv.val = maxVal;

	if (maxVal == 0) {
		hsv.sat = 0;
		hsv.hue = 0;
		return hsv;
	}

	hsv.sat = 255 * (maxVal - minVal) / maxVal;

	if (hsv.sat == 0) {
		hsv.hue = 0;
		return hsv;
	}

	int32_t delta = maxVal - minVal;
	if (rgb.r == maxVal) {
		hsv.hue = 43 * (rgb.g - rgb.b) / delta;
	} else if (rgb.g == maxVal) {
		hsv.hue = 85 + 43 * (rgb.b - rgb.r) / delta;
	} else {
		hsv.hue = 171 + 43 * (rgb.r - rgb.g) / delta;
	}

	return hsv;
}

/**
 * Mock FastLED class for native testing
 * Simulates LED control without actual hardware
 */
class CFastLED {
  public:
	template <typename LED_TYPE, uint8_t PIN, typename COLOR_ORDER>
	void addLeds(CRGB* leds, int count) {
		(void)leds;
		(void)count;
	}

	void setBrightness(uint8_t brightness) { (void)brightness; }
	void show() {}
	void clear() {}
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

// Random number generation (seeded for reproducible tests)
static uint16_t mockRandomSeed = 12345;

inline void random16_set_seed(uint16_t seed) {
	mockRandomSeed = seed;
	srand(seed);
}

inline uint16_t random16() {
	return static_cast<uint16_t>(rand());
}

inline uint8_t random8() {
	return static_cast<uint8_t>(rand() & 0xFF);
}

inline uint8_t random8(uint8_t max) {
	return random8() % max;
}

inline long random(long max) {
	return rand() % max;
}

inline long random(long min, long max) {
	return min + (rand() % (max - min));
}

// Math constants
#ifndef PI
#define PI 3.14159265358979323846f
#endif

// min/max macros (if not defined)
#ifndef min
#define min(a,b) ((a)<(b)?(a):(b))
#endif

#ifndef max
#define max(a,b) ((a)>(b)?(a):(b))
#endif

#endif // UNIT_TEST
#endif // MOCK_FASTLED_H
