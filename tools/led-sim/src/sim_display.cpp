/**
 * Simulator Display Implementation
 */
#include "sim_display.h"
#include "constants.h"
#include "graphics/matrix.h"
#include "raylib_compat.h"
#include "window.h"

// Global display for HAL
static hal::IDisplay* g_display = nullptr;

namespace hal {
IDisplay& getDisplay() {
	return *g_display;
}
}  // namespace hal

SimDisplay::SimDisplay(uint16_t ledWidth, uint16_t ledHeight, int windowWidth, int windowHeight,
                       float ledSize, float ledGap)
	: ledWidth_(ledWidth), ledHeight_(ledHeight), windowWidth_(windowWidth),
	  windowHeight_(windowHeight), ledSize_(ledSize), ledGap_(ledGap), brightness_(255),
	  matrix_(nullptr) {
	// Center the grid in the window
	float gridWidth = ledWidth * (ledSize_ + ledGap_) - ledGap_;
	float gridHeight = ledHeight * (ledSize_ + ledGap_) - ledGap_;
	offsetX_ = (windowWidth_ - gridWidth) / 2.0f;
	offsetY_ = (windowHeight_ - STATUS_BAR_HEIGHT - gridHeight) / 2.0f;
}

void SimDisplay::setMatrix(const Matrix* matrix) {
	matrix_ = matrix;
}

void SimDisplay::show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) {
	// Handle window resize
	int currentWidth = GetScreenWidth();
	int currentHeight = GetScreenHeight();
	if (currentWidth != windowWidth_ || currentHeight != windowHeight_) {
		windowWidth_ = currentWidth;
		windowHeight_ = currentHeight;
		calculateLedSizeForWindow(windowWidth_, windowHeight_, ledWidth_, ledHeight_, ledSize_, ledGap_);
		// Recalculate offsets for centering
		float gridWidth = ledWidth_ * (ledSize_ + ledGap_) - ledGap_;
		float gridHeight = ledHeight_ * (ledSize_ + ledGap_) - ledGap_;
		offsetX_ = (windowWidth_ - gridWidth) / 2.0f;
		offsetY_ = (windowHeight_ - STATUS_BAR_HEIGHT - gridHeight) / 2.0f;
	}

	BeginDrawing();
	ClearBackground(RAYLIB_DARKGRAY);

	float brightnessScale = brightness_ / 255.0f;

	// Iterate over logical screen positions
	// Use coordinate map to find the physical LED index for each position
	float radius = ledSize_ / 2.0f;
	float glowRadius = radius * 2.5f;  // Glow extends beyond LED

	for (uint16_t y = 0; y < height && y < ledHeight_; y++) {
		for (uint16_t x = 0; x < width && x < ledWidth_; x++) {
			// Get physical LED index from matrix coordinate map
			uint32_t physicalIdx = matrix_->coordinateMap[y * width + x];
			if (physicalIdx >= count) continue;

			const CRGB& pixel = pixels[physicalIdx];

			uint8_t r = static_cast<uint8_t>(pixel.r * brightnessScale);
			uint8_t g = static_cast<uint8_t>(pixel.g * brightnessScale);
			uint8_t b = static_cast<uint8_t>(pixel.b * brightnessScale);

			float screenX = offsetX_ + x * (ledSize_ + ledGap_) + radius;
			float screenY = offsetY_ + y * (ledSize_ + ledGap_) + radius;

			// Draw glow layers (outer to inner, increasing opacity)
			// Only draw glow if pixel has meaningful brightness
			int brightness = (r + g + b) / 3;
			if (brightness > 10) {
				// Draw multiple glow rings with decreasing opacity
				for (int ring = 4; ring >= 1; ring--) {
					float ringRadius = radius + (glowRadius - radius) * (ring / 4.0f);
					uint8_t alpha = static_cast<uint8_t>(brightness * 0.15f * (5 - ring) / 4);
					unsigned int glowColor = (alpha << 24) | (b << 16) | (g << 8) | r;
					DrawCircle(static_cast<int>(screenX), static_cast<int>(screenY), ringRadius, glowColor);
				}
			}

			// Draw the LED core (solid circle)
			unsigned int color = (0xFF << 24) | (b << 16) | (g << 8) | r;
			DrawCircle(static_cast<int>(screenX), static_cast<int>(screenY), radius, color);
		}
	}

	// Draw info text at bottom
	DrawText(TextFormat("%dx%d @ %dfps", width, height, GetFPS()), 10,
	         windowHeight_ - STATUS_BAR_HEIGHT + 5, 16, RAYLIB_LIGHTGRAY);

	EndDrawing();
}

void SimDisplay::setBrightness(uint8_t brightness) {
	brightness_ = brightness;
}

bool SimDisplay::shouldQuit() {
	return WindowShouldClose();
}

void initDisplay(uint16_t ledWidth, uint16_t ledHeight, int windowWidth, int windowHeight,
                 float ledSize, float ledGap) {
	g_display = new SimDisplay(ledWidth, ledHeight, windowWidth, windowHeight, ledSize, ledGap);
}

void cleanupDisplay() {
	delete g_display;
	g_display = nullptr;
}
