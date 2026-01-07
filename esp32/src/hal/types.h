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

// Arduino compatibility macros
#ifndef constrain
#define constrain(amt, low, high) ((amt) < (low) ? (low) : ((amt) > (high) ? (high) : (amt)))
#endif

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

// Forward declaration of hal::random for use in random16
namespace hal {
int32_t random(int32_t max);
}

inline uint16_t random16() {
	// Use hal::random for portable cross-platform determinism with seeded xorshift32
	return static_cast<uint16_t>(hal::random(0x10000));
}

inline uint16_t random16(uint16_t lim) {
	return random16() % lim;
}

inline uint16_t random16(uint16_t min, uint16_t lim) {
	return min + random16(lim - min);
}

/**
 * FastLED-compatible sin8 using lookup table
 * Input: 0-255 (one full wave)
 * Output: 0-255 (0 = -1.0, 128 = 0.0, 255 = +1.0)
 */
inline uint8_t sin8(uint8_t theta) {
	// Sine wave lookup table (quarter wave, 64 entries)
	static const uint8_t sinTable[64] = {
		128, 131, 134, 137, 140, 143, 146, 149, 152, 155, 158, 162, 165, 167, 170, 173,
		176, 179, 182, 185, 188, 190, 193, 196, 198, 201, 203, 206, 208, 211, 213, 215,
		218, 220, 222, 224, 226, 228, 230, 232, 234, 235, 237, 239, 240, 241, 243, 244,
		245, 246, 248, 249, 250, 250, 251, 252, 253, 253, 254, 254, 254, 255, 255, 255
	};

	uint8_t index = theta & 0x3F;  // 0-63
	uint8_t quadrant = (theta >> 6) & 0x03;

	uint8_t value;
	switch (quadrant) {
		case 0:
			value = sinTable[index];
			break;
		case 1:
			value = sinTable[63 - index];
			break;
		case 2:
			value = 255 - sinTable[index];
			break;
		default:
			value = 255 - sinTable[63 - index];
			break;
	}
	return value;
}

/**
 * FastLED-compatible cos8
 */
inline uint8_t cos8(uint8_t theta) {
	return sin8(theta + 64);
}

/**
 * FastLED-compatible sqrt16 - fast integer square root for 16-bit values
 */
inline uint8_t sqrt16(uint16_t x) {
	if (x == 0) return 0;

	uint8_t result = 0;
	uint8_t bit = 0x80;

	while (bit) {
		uint8_t trial = result | bit;
		if ((uint16_t)trial * trial <= x) {
			result = trial;
		}
		bit >>= 1;
	}
	return result;
}

/**
 * Permutation table for Perlin noise
 */
static const uint8_t p[512] = {
	151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
	8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
	35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
	134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
	55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
	18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
	250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
	189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
	172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
	228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
	107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
	// Repeat for wraparound
	151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
	8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
	35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
	134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
	55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
	18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
	250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
	189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
	172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
	228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
	107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
};

inline float fade(float t) {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

inline float lerp(float t, float a, float b) {
	return a + t * (b - a);
}

inline float grad(int hash, float x, float y, float z) {
	int h = hash & 15;
	float u = h < 8 ? x : y;
	float v = h < 4 ? y : (h == 12 || h == 14 ? x : z);
	return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

/**
 * 3D Perlin noise, returns value in range [-1, 1]
 */
inline float perlin(float x, float y, float z) {
	int X = (int)floorf(x) & 255;
	int Y = (int)floorf(y) & 255;
	int Z = (int)floorf(z) & 255;

	x -= floorf(x);
	y -= floorf(y);
	z -= floorf(z);

	float u = fade(x);
	float v = fade(y);
	float w = fade(z);

	int A  = p[X] + Y;
	int AA = p[A] + Z;
	int AB = p[A + 1] + Z;
	int B  = p[X + 1] + Y;
	int BA = p[B] + Z;
	int BB = p[B + 1] + Z;

	return lerp(w,
		lerp(v,
			lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
			lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
		),
		lerp(v,
			lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
			lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
		)
	);
}

/**
 * FastLED-compatible inoise8 - 3D Perlin noise returning 0-255
 */
inline uint8_t inoise8(uint16_t x, uint16_t y, uint16_t z) {
	float fx = x / 256.0f;
	float fy = y / 256.0f;
	float fz = z / 256.0f;
	float n = perlin(fx, fy, fz);
	// Perlin noise typically ranges ~[-0.7, 0.7], amplify to use full 0-255 range
	n = n * 1.5f;
	if (n < -1.0f) n = -1.0f;
	if (n > 1.0f) n = 1.0f;
	return (uint8_t)((n + 1.0f) * 127.5f);
}

/**
 * 2D version of inoise8
 */
inline uint8_t inoise8(uint16_t x, uint16_t y) {
	return inoise8(x, y, 0);
}

#endif  // ESP32
