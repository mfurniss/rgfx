/**
 * Platform-Agnostic Color Types
 *
 * On ESP32: Includes FastLED types directly
 * On Native/Test: Provides CRGB and CHSV that are binary-compatible with FastLED
 *
 * Used by both ESP32 firmware and native LED simulator.
 */
#pragma once

#ifdef ESP32
// On ESP32, use FastLED's actual types
#include <FastLED.h>
// FastLED provides CRGB, CHSV, fill_solid, hsv2rgb_rainbow, etc.

#else
// On native/test platforms, provide our own compatible types
#include <cstdint>
#include <cstdlib>
#include <algorithm>
#include <cmath>

// Arduino compatibility
#ifndef PI
#define PI 3.14159265358979323846
#endif

using std::min;
using std::max;

/**
 * RGB color - binary compatible with FastLED's CRGB
 */
struct CRGB {
	union {
		struct {
			uint8_t r;
			uint8_t g;
			uint8_t b;
		};
		uint8_t raw[3];
	};

	// Constructors
	CRGB() : r(0), g(0), b(0) {}
	CRGB(uint8_t red, uint8_t green, uint8_t blue) : r(red), g(green), b(blue) {}

	// Construct from 0xRRGGBB color code
	CRGB(uint32_t colorcode)
		: r((colorcode >> 16) & 0xFF), g((colorcode >> 8) & 0xFF), b(colorcode & 0xFF) {}

	// Comparison
	bool operator==(const CRGB& other) const {
		return r == other.r && g == other.g && b == other.b;
	}

	bool operator!=(const CRGB& other) const { return !(*this == other); }

	// Named colors as static constants (matching FastLED's HTML color codes)
	static const uint32_t Black = 0x000000;
	static const uint32_t Red = 0xFF0000;
	static const uint32_t Green = 0x008000;	 // HTML green (not lime)
	static const uint32_t Blue = 0x0000FF;
	static const uint32_t White = 0xFFFFFF;
	static const uint32_t Yellow = 0xFFFF00;
	static const uint32_t Cyan = 0x00FFFF;
	static const uint32_t Magenta = 0xFF00FF;
	static const uint32_t Orange = 0xFFA500;
	static const uint32_t Purple = 0x800080;
	static const uint32_t Pink = 0xFFC0CB;
	static const uint32_t Lime = 0x00FF00;
	static const uint32_t Aqua = 0x00FFFF;
	static const uint32_t Navy = 0x000080;
	static const uint32_t Teal = 0x008080;
	static const uint32_t Olive = 0x808000;
	static const uint32_t Maroon = 0x800000;
	static const uint32_t Silver = 0xC0C0C0;
	static const uint32_t Gray = 0x808080;
	static const uint32_t Grey = 0x808080;
};

// Forward declaration for CHSV->CRGB conversion
struct CHSV;
CRGB hsv2rgb(const CHSV& hsv);

/**
 * HSV color
 */
struct CHSV {
	uint8_t hue;
	uint8_t sat;
	uint8_t val;

	CHSV() : hue(0), sat(0), val(0) {}
	CHSV(uint8_t h, uint8_t s, uint8_t v) : hue(h), sat(s), val(v) {}

	// Allow implicit conversion to CRGB (FastLED allows this)
	operator CRGB() const { return hsv2rgb(*this); }
};

/**
 * Convert HSV to RGB
 * Uses FastLED-compatible algorithm (hue 0-255 maps to full color wheel)
 */
inline CRGB hsv2rgb(const CHSV& hsv) {
	if (hsv.sat == 0) {
		return CRGB(hsv.val, hsv.val, hsv.val);
	}

	uint8_t region = hsv.hue / 43;
	uint8_t remainder = (hsv.hue - (region * 43)) * 6;

	uint8_t p = (hsv.val * (255 - hsv.sat)) >> 8;
	uint8_t q = (hsv.val * (255 - ((hsv.sat * remainder) >> 8))) >> 8;
	uint8_t t = (hsv.val * (255 - ((hsv.sat * (255 - remainder)) >> 8))) >> 8;

	switch (region) {
		case 0:
			return CRGB(hsv.val, t, p);
		case 1:
			return CRGB(q, hsv.val, p);
		case 2:
			return CRGB(p, hsv.val, t);
		case 3:
			return CRGB(p, q, hsv.val);
		case 4:
			return CRGB(t, p, hsv.val);
		default:
			return CRGB(hsv.val, p, q);
	}
}

/**
 * Convert RGB to HSV (approximate)
 */
inline CHSV rgb2hsv(const CRGB& rgb) {
	uint8_t maxVal =
		rgb.r > rgb.g ? (rgb.r > rgb.b ? rgb.r : rgb.b) : (rgb.g > rgb.b ? rgb.g : rgb.b);
	uint8_t minVal =
		rgb.r < rgb.g ? (rgb.r < rgb.b ? rgb.r : rgb.b) : (rgb.g < rgb.b ? rgb.g : rgb.b);

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
 * Fill an array of CRGB with a solid color
 */
inline void fill_solid(CRGB* leds, int count, const CRGB& color) {
	for (int i = 0; i < count; i++) {
		leds[i] = color;
	}
}

/**
 * FastLED-compatible alias for rgb2hsv
 */
inline CHSV rgb2hsv_approximate(const CRGB& rgb) {
	return rgb2hsv(rgb);
}

/**
 * FastLED-compatible random functions
 */
inline uint8_t random8() {
	return static_cast<uint8_t>(rand() & 0xFF);
}

inline uint8_t random8(uint8_t lim) {
	return random8() % lim;
}

inline uint8_t random8(uint8_t min, uint8_t lim) {
	return min + random8(lim - min);
}

inline uint16_t random16() {
	return static_cast<uint16_t>(rand() & 0xFFFF);
}

inline uint16_t random16(uint16_t lim) {
	return random16() % lim;
}

inline uint16_t random16(uint16_t min, uint16_t lim) {
	return min + random16(lim - min);
}

#endif  // ESP32
