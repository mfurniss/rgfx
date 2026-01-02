/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include <cstdint>
#include <ArduinoJson.h>
#include "graphics/canvas.h"
#include "hal/types.h"

namespace test_helpers {

/**
 * Bounding box result for findBoundingBox
 */
struct BoundingBox {
	int16_t minX;
	int16_t maxX;
	int16_t minY;
	int16_t maxY;
	bool valid;  // false if no non-black pixels found
};

/**
 * Check if a pixel is non-black (any channel > 0)
 */
inline bool isNonBlack(const CRGB& pixel) {
	return pixel.r != 0 || pixel.g != 0 || pixel.b != 0;
}

/**
 * Count non-black pixels in the canvas
 */
inline int countNonBlackPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Find bounding box of all non-black pixels
 */
inline BoundingBox findBoundingBox(Canvas& canvas) {
	BoundingBox box = {
	    static_cast<int16_t>(canvas.getWidth()),   // minX starts at max
	    -1,                                        // maxX starts at min
	    static_cast<int16_t>(canvas.getHeight()),  // minY starts at max
	    -1,                                        // maxY starts at min
	    false};

	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				if (x < box.minX) box.minX = x;
				if (x > box.maxX) box.maxX = x;
				if (y < box.minY) box.minY = y;
				if (y > box.maxY) box.maxY = y;
				box.valid = true;
			}
		}
	}

	return box;
}

/**
 * Find leftmost non-black pixel X coordinate (-1 if none)
 */
inline int findLeftmostPixelX(Canvas& canvas) {
	for (uint16_t x = 0; x < canvas.getWidth(); x++) {
		for (uint16_t y = 0; y < canvas.getHeight(); y++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return x;
			}
		}
	}
	return -1;
}

/**
 * Find rightmost non-black pixel X coordinate (-1 if none)
 */
inline int findRightmostPixelX(Canvas& canvas) {
	for (int x = canvas.getWidth() - 1; x >= 0; x--) {
		for (uint16_t y = 0; y < canvas.getHeight(); y++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return x;
			}
		}
	}
	return -1;
}

/**
 * Find topmost non-black pixel Y coordinate (-1 if none)
 */
inline int findTopmostPixelY(Canvas& canvas) {
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return y;
			}
		}
	}
	return -1;
}

/**
 * Find bottommost non-black pixel Y coordinate (-1 if none)
 */
inline int findBottommostPixelY(Canvas& canvas) {
	for (int y = canvas.getHeight() - 1; y >= 0; y--) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				return y;
			}
		}
	}
	return -1;
}

/**
 * Get pixel at percentage position (0-100 for both x and y)
 */
inline CRGB getPixelAtPercent(Canvas& canvas, float xPercent, float yPercent) {
	uint16_t x = static_cast<uint16_t>((xPercent / 100.0f) * (canvas.getWidth() - 1));
	uint16_t y = static_cast<uint16_t>((yPercent / 100.0f) * (canvas.getHeight() - 1));
	return canvas.getPixel(x, y);
}

/**
 * Check if pixel at position matches expected color within tolerance
 */
inline bool pixelMatches(Canvas& canvas, uint16_t x, uint16_t y, uint8_t expectedR,
                         uint8_t expectedG, uint8_t expectedB, uint8_t tolerance = 5) {
	CRGB pixel = canvas.getPixel(x, y);
	int dr = static_cast<int>(pixel.r) - static_cast<int>(expectedR);
	int dg = static_cast<int>(pixel.g) - static_cast<int>(expectedG);
	int db = static_cast<int>(pixel.b) - static_cast<int>(expectedB);
	return (dr >= -tolerance && dr <= tolerance && dg >= -tolerance && dg <= tolerance &&
	        db >= -tolerance && db <= tolerance);
}

/**
 * Check if canvas is completely black (all pixels are 0,0,0)
 */
inline bool isCanvasEmpty(Canvas& canvas) {
	return countNonBlackPixels(canvas) == 0;
}

/**
 * Count pixels that have a specific color channel dominant
 * Useful for verifying color correctness
 */
inline int countRedDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > p.g && p.r > p.b && p.r > 0) {
				count++;
			}
		}
	}
	return count;
}

inline int countGreenDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.g > p.r && p.g > p.b && p.g > 0) {
				count++;
			}
		}
	}
	return count;
}

inline int countBlueDominantPixels(Canvas& canvas) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.b > p.r && p.b > p.g && p.b > 0) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Count pixels that are white/gray (all channels roughly equal and bright enough)
 * Requires minimum brightness to avoid counting dim single-channel colors as white
 */
inline int countWhitePixels(Canvas& canvas, uint8_t tolerance = 10, uint8_t minBrightness = 30) {
	int count = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			// Skip dim pixels - they can appear "white" when all channels are near zero
			uint8_t maxChannel = (p.r > p.g) ? ((p.r > p.b) ? p.r : p.b) : ((p.g > p.b) ? p.g : p.b);
			if (maxChannel < minBrightness) continue;
			int dr = abs(static_cast<int>(p.r) - static_cast<int>(p.g));
			int dg = abs(static_cast<int>(p.g) - static_cast<int>(p.b));
			int db = abs(static_cast<int>(p.b) - static_cast<int>(p.r));
			if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
				count++;
			}
		}
	}
	return count;
}

/**
 * Calculate total brightness of canvas (sum of all RGB values)
 * Useful for verifying fading effects
 */
inline uint64_t calculateTotalBrightness(Canvas& canvas) {
	uint64_t total = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			total += p.r + p.g + p.b;
		}
	}
	return total;
}

/**
 * Get maximum brightness value in canvas
 */
inline uint8_t getMaxBrightness(Canvas& canvas) {
	uint8_t maxVal = 0;
	for (uint16_t y = 0; y < canvas.getHeight(); y++) {
		for (uint16_t x = 0; x < canvas.getWidth(); x++) {
			CRGB p = canvas.getPixel(x, y);
			if (p.r > maxVal) maxVal = p.r;
			if (p.g > maxVal) maxVal = p.g;
			if (p.b > maxVal) maxVal = p.b;
		}
	}
	return maxVal;
}

/**
 * Count pixels in a specific quadrant (0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right)
 */
inline int countPixelsInQuadrant(Canvas& canvas, int quadrant) {
	int count = 0;
	uint16_t midX = canvas.getWidth() / 2;
	uint16_t midY = canvas.getHeight() / 2;

	uint16_t startX = (quadrant == 1 || quadrant == 3) ? midX : 0;
	uint16_t endX = (quadrant == 1 || quadrant == 3) ? canvas.getWidth() : midX;
	uint16_t startY = (quadrant == 2 || quadrant == 3) ? midY : 0;
	uint16_t endY = (quadrant == 2 || quadrant == 3) ? canvas.getHeight() : midY;

	for (uint16_t y = startY; y < endY; y++) {
		for (uint16_t x = startX; x < endX; x++) {
			if (isNonBlack(canvas.getPixel(x, y))) {
				count++;
			}
		}
	}
	return count;
}

// =============================================================================
// Default Props Helpers
// These create complete payloads matching the hub's Zod schema defaults.
// Use these when testing effects to ensure all required fields are present.
// =============================================================================

/**
 * Create default pulse props (matches hub schema defaults)
 */
inline void setDefaultPulseProps(JsonDocument& props) {
	props["color"] = "#FFFFFF";
	props["reset"] = false;
	props["duration"] = 800;
	props["easing"] = "quinticOut";
	props["fade"] = true;
	props["collapse"] = "random";
}

/**
 * Create default explode props (matches hub schema defaults)
 */
inline void setDefaultExplodeProps(JsonDocument& props) {
	props["color"] = "#FFFFFF";
	props["reset"] = false;
	props["centerX"] = 50;
	props["centerY"] = 50;
	props["friction"] = 3.0f;
	props["hueSpread"] = 0;
	props["lifespan"] = 700;
	props["lifespanSpread"] = 50.0f;
	props["particleCount"] = 100;
	props["particleSize"] = 6;
	props["power"] = 50.0f;
	props["powerSpread"] = 80.0f;
}

/**
 * Create default wipe props (matches hub schema defaults)
 */
inline void setDefaultWipeProps(JsonDocument& props) {
	props["color"] = "#FFFFFF";
	props["reset"] = false;
	props["direction"] = "random";
	props["duration"] = 500;
	props["blendMode"] = "additive";
}

/**
 * Create default projectile props (test-friendly defaults, not hub schema)
 */
inline void setDefaultProjectileProps(JsonDocument& props) {
	props["color"] = "#FFFFFF";
	props["reset"] = false;
	props["direction"] = "right";
	props["velocity"] = 200;
	props["friction"] = 0.0f;
	props["trail"] = 0.0f;
	props["width"] = 4;
	props["height"] = 4;
	props["lifespan"] = 5000;
}

/**
 * Create default plasma props (matches hub schema defaults)
 */
inline void setDefaultPlasmaProps(JsonDocument& props) {
	props["speed"] = 3.0f;
	props["scale"] = 4.0f;
	props["enabled"] = "on";
}

/**
 * Create default background props (matches hub schema defaults)
 */
inline void setDefaultBackgroundProps(JsonDocument& props) {
	props["color"] = "#000000";
	props["enabled"] = "on";
}

/**
 * Create default text props (matches hub schema defaults)
 */
inline void setDefaultTextProps(JsonDocument& props) {
	props["reset"] = true;
	props["text"] = "Hello you!";
	props["color"] = "#008888";
	props["accentColor"] = "#004444";
	props["x"] = 0;
	props["y"] = 0;
	props["duration"] = 3000;
}

/**
 * Create default scroll text props (matches hub schema defaults)
 */
inline void setDefaultScrollTextProps(JsonDocument& props) {
	props["reset"] = true;
	props["text"] = "Hidey Ho! It's the RGFX Show!";
	props["color"] = "#808000";
	props["accentColor"] = "#006060";
	props["y"] = 0;
	props["speed"] = 150.0f;
	props["repeat"] = true;
	props["snapToLed"] = true;
}

/**
 * Add PICO-8 palette to props (for bitmap effect tests)
 */
inline void addPico8Palette(JsonDocument& props) {
	JsonArray palette = props["palette"].to<JsonArray>();
	palette.add("#000000");  // 0: Black
	palette.add("#1D2B53");  // 1: Dark Blue
	palette.add("#7E2553");  // 2: Dark Purple
	palette.add("#008751");  // 3: Dark Green
	palette.add("#AB5236");  // 4: Brown
	palette.add("#5F574F");  // 5: Dark Gray
	palette.add("#C2C3C7");  // 6: Light Gray
	palette.add("#FFF1E8");  // 7: White
	palette.add("#FF004D");  // 8: Red
	palette.add("#FFA300");  // 9: Orange
	palette.add("#FFEC27");  // A: Yellow
	palette.add("#00E436");  // B: Green
	palette.add("#29ADFF");  // C: Blue
	palette.add("#83769C");  // D: Lavender
	palette.add("#FF77A8");  // E: Pink
	palette.add("#FFCCAA");  // F: Peach
}

// =============================================================================
// Mock Props Factory Functions
// Convenience functions that return a pre-configured JsonDocument.
// Use when you need a complete mock payload for testing.
// =============================================================================

/**
 * Create a mock pulse effect payload
 * @param color Hex color string (default: "#FF0000")
 * @param duration Duration in ms (default: 800)
 */
inline JsonDocument mockPulseProps(const char* color = "#FF0000", uint32_t duration = 800) {
	JsonDocument props;
	setDefaultPulseProps(props);
	props["color"] = color;
	props["duration"] = duration;
	return props;
}

/**
 * Create a mock explode effect payload
 * @param color Hex color string (default: "#FF0000")
 * @param particleCount Number of particles (default: 100)
 * @param power Initial velocity (default: 60)
 */
inline JsonDocument mockExplodeProps(const char* color = "#FF0000", uint32_t particleCount = 100, float power = 60.0f) {
	JsonDocument props;
	setDefaultExplodeProps(props);
	props["color"] = color;
	props["particleCount"] = particleCount;
	props["power"] = power;
	return props;
}

/**
 * Create a mock wipe effect payload
 * @param color Hex color string (default: "#FF0000")
 * @param direction Direction string (default: "right")
 * @param duration Duration in ms (default: 500)
 * @param blendMode Blend mode (default: "additive")
 */
inline JsonDocument mockWipeProps(const char* color = "#FF0000", const char* direction = "right", uint32_t duration = 500, const char* blendMode = "additive") {
	JsonDocument props;
	setDefaultWipeProps(props);
	props["color"] = color;
	props["direction"] = direction;
	props["duration"] = duration;
	props["blendMode"] = blendMode;
	return props;
}

/**
 * Create a mock projectile effect payload
 * @param color Hex color string (default: "#FF0000")
 * @param direction Direction string (default: "right")
 * @param velocity Initial velocity (default: 1200)
 */
inline JsonDocument mockProjectileProps(const char* color = "#FF0000", const char* direction = "right", uint32_t velocity = 1200) {
	JsonDocument props;
	setDefaultProjectileProps(props);
	props["color"] = color;
	props["direction"] = direction;
	props["velocity"] = velocity;
	return props;
}

/**
 * Create a mock plasma effect payload
 * @param enabled Enable state (default: "on")
 * @param speed Animation speed (default: 3.0)
 * @param scale Pattern scale (default: 4.0)
 */
inline JsonDocument mockPlasmaProps(const char* enabled = "on", float speed = 3.0f, float scale = 4.0f) {
	JsonDocument props;
	setDefaultPlasmaProps(props);
	props["enabled"] = enabled;
	props["speed"] = speed;
	props["scale"] = scale;
	return props;
}

/**
 * Create a mock background effect payload
 * @param color Hex color string (default: "#0000FF")
 * @param enabled Enable state (default: "on")
 */
inline JsonDocument mockBackgroundProps(const char* color = "#0000FF", const char* enabled = "on") {
	JsonDocument props;
	setDefaultBackgroundProps(props);
	props["color"] = color;
	props["enabled"] = enabled;
	return props;
}

/**
 * Create a mock text effect payload
 * @param text Text to display (default: "Test")
 * @param color Hex color string (default: "#FFFFFF")
 * @param duration Duration in ms (default: 3000)
 */
inline JsonDocument mockTextProps(const char* text = "Test", const char* color = "#FFFFFF", uint32_t duration = 3000) {
	JsonDocument props;
	setDefaultTextProps(props);
	props["text"] = text;
	props["color"] = color;
	props["duration"] = duration;
	return props;
}

/**
 * Create a mock scroll text effect payload
 * @param text Text to scroll (default: "Scrolling")
 * @param color Hex color string (default: "#FFFFFF")
 * @param speed Scroll speed (default: 150)
 */
inline JsonDocument mockScrollTextProps(const char* text = "Scrolling", const char* color = "#FFFFFF", float speed = 150.0f) {
	JsonDocument props;
	setDefaultScrollTextProps(props);
	props["text"] = text;
	props["color"] = color;
	props["speed"] = speed;
	return props;
}


/**
 * Create default spectrum props
 */
inline void setDefaultSpectrumProps(JsonDocument& props) {
	props["decayRate"] = 2.1f;
	JsonArray values = props["values"].to<JsonArray>();
	values.add(5);
	values.add(5);
	values.add(5);
	values.add(5);
	values.add(5);
}

/**
 * Create a mock spectrum effect payload
 * @param numColumns Number of columns to create (default: 5)
 * @param value Value for all columns 0-9 (default: 5)
 * @param decayRate Decay speed (default: 2.1)
 */
inline JsonDocument mockSpectrumProps(size_t numColumns = 5, int value = 5, float decayRate = 2.1f) {
	JsonDocument props;
	props["decayRate"] = decayRate;
	JsonArray values = props["values"].to<JsonArray>();
	for (size_t i = 0; i < numColumns; i++) {
		values.add(value);
	}
	return props;
}

/**
 * Add a single-frame image to props["images"]
 * This creates the images array with one frame containing the provided rows
 * @param props JsonDocument to add the image to
 * @param rows Vector of row strings
 */
inline void addSingleFrameImage(JsonDocument& props, std::initializer_list<const char*> rows) {
	JsonArray images = props["images"].to<JsonArray>();
	JsonArray frame = images.add<JsonArray>();
	for (const char* row : rows) {
		frame.add(row);
	}
}

/**
 * Add multiple frames to props["images"]
 * @param props JsonDocument to add images to
 * @param frames Vector of frames, each frame is a vector of row strings
 */
inline void addMultiFrameImages(JsonDocument& props, std::initializer_list<std::initializer_list<const char*>> frames) {
	JsonArray images = props["images"].to<JsonArray>();
	for (auto& frameRows : frames) {
		JsonArray frame = images.add<JsonArray>();
		for (const char* row : frameRows) {
			frame.add(row);
		}
	}
}

}  // namespace test_helpers
