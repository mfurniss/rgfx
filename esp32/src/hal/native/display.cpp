/**
 * Native Raylib Display Implementation
 *
 * Renders LED pixels to a desktop window using raylib.
 * Supports both matrix (2D grid) and strip (1D row) layouts.
 *
 * Note: Window initialization is done externally in the simulator main.cpp,
 * so this class only handles rendering, not window management.
 */
#include "hal/display.h"
#include <raylib.h>
#include <cmath>

namespace hal {

RaylibDisplay::RaylibDisplay(uint16_t ledWidth, uint16_t ledHeight, int ledSize, int ledGap,
                             int padding)
	: ledWidth_(ledWidth),
	  ledHeight_(ledHeight),
	  ledSize_(ledSize),
	  ledGap_(ledGap),
	  padding_(padding),
	  brightness_(255) {}

RaylibDisplay::~RaylibDisplay() {}

void RaylibDisplay::show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) {
	BeginDrawing();
	ClearBackground(BLACK);

	// Apply brightness scaling
	float brightnessScale = brightness_ / 255.0f;

	for (uint16_t y = 0; y < height && y < ledHeight_; y++) {
		for (uint16_t x = 0; x < width && x < ledWidth_; x++) {
			uint32_t idx = y * width + x;
			if (idx >= count) break;

			const CRGB& pixel = pixels[idx];

			// Apply brightness
			uint8_t r = static_cast<uint8_t>(pixel.r * brightnessScale);
			uint8_t g = static_cast<uint8_t>(pixel.g * brightnessScale);
			uint8_t b = static_cast<uint8_t>(pixel.b * brightnessScale);

			Color color = {r, g, b, 255};

			int screenX = padding_ + x * (ledSize_ + ledGap_);
			int screenY = padding_ + y * (ledSize_ + ledGap_);

			// Draw LED as rounded rectangle for realistic look
			DrawRectangleRounded(
				{static_cast<float>(screenX), static_cast<float>(screenY),
				 static_cast<float>(ledSize_), static_cast<float>(ledSize_)},
				0.3f,  // roundness
				4,     // segments
				color);
		}
	}

	// Draw info text
	DrawText(TextFormat("%dx%d @ %dfps", width, height, GetFPS()), 10,
	         padding_ + ledHeight_ * (ledSize_ + ledGap_) + 5, 16, DARKGRAY);

	EndDrawing();
}

void RaylibDisplay::setBrightness(uint8_t brightness) {
	brightness_ = brightness;
}

bool RaylibDisplay::shouldQuit() {
	return WindowShouldClose();
}

}  // namespace hal
