/**
 * LED Simulator - Native Effect Development Tool
 *
 * Runs the same effect code as ESP32 firmware but renders to a window
 * using raylib. Enables rapid iteration on effects without flashing hardware.
 *
 * Usage:
 *   ./led-sim [width] [height] [layout]
 *
 * Example:
 *   ./led-sim 32 8 matrix-tl-h    # 32x8 matrix
 *   ./led-sim 60 1 strip          # 60 LED strip
 */

// Include our headers FIRST to avoid raylib namespace conflicts
#include "graphics/matrix.h"
#include "graphics/downsample_to_matrix.h"
#include "effects/effect_processor.h"
#include "hal/display.h"
#include "hal/platform.h"
#include "hal/types.h"

// ArduinoJson for parsing effect commands
#include <ArduinoJson.h>

// Standard library
#include <cstdio>
#include <cstring>
#include <string>

// Raylib - must be included AFTER our headers due to Matrix/BlendMode conflicts
// We forward declare the functions we need to avoid pulling in the full header
extern "C" {
void InitWindow(int width, int height, const char* title);
void CloseWindow(void);
void SetTargetFPS(int fps);
bool WindowShouldClose(void);
float GetFrameTime(void);
int GetFPS(void);
bool IsKeyPressed(int key);
void BeginDrawing(void);
void EndDrawing(void);
void ClearBackground(unsigned int color);
void DrawRectangleRounded(float x, float y, float width, float height, float roundness, int segments, unsigned int color);
void DrawText(const char* text, int posX, int posY, int fontSize, unsigned int color);
const char* TextFormat(const char* text, ...);
}

// Key codes
#define KEY_SPACE 32
#define KEY_C 67
#define KEY_D 68
#define KEY_Q 81

// Colors (ABGR format for raylib)
#define RAYLIB_BLACK 0xFF000000
#define RAYLIB_DARKGRAY 0xFF505050
#define RAYLIB_WHITE 0xFFFFFFFF

// Window configuration
static const int WINDOW_PADDING = 20;
static const int LED_SIZE = 20;  // Size of each LED pixel on screen
static const int LED_GAP = 2;    // Gap between LEDs

// Simple display implementation for simulator (avoiding raylib header conflicts)
class SimDisplay : public hal::IDisplay {
   public:
	SimDisplay(uint16_t ledWidth, uint16_t ledHeight, int ledSize, int ledGap, int padding)
		: ledWidth_(ledWidth),
		  ledHeight_(ledHeight),
		  ledSize_(ledSize),
		  ledGap_(ledGap),
		  padding_(padding),
		  brightness_(255) {}

	void show(const CRGB* pixels, uint32_t count, uint16_t width, uint16_t height) override {
		BeginDrawing();
		ClearBackground(RAYLIB_DARKGRAY);

		// Apply brightness scaling
		float brightnessScale = brightness_ / 255.0f;

		for (uint16_t y = 0; y < height && y < ledHeight_; y++) {
			for (uint16_t x = 0; x < width && x < ledWidth_; x++) {
				uint32_t idx = y * width + x;
				if (idx >= count) break;

				const CRGB& pixel = pixels[idx];

				// Apply brightness and pack into ABGR (raylib's color format)
				uint8_t r = static_cast<uint8_t>(pixel.r * brightnessScale);
				uint8_t g = static_cast<uint8_t>(pixel.g * brightnessScale);
				uint8_t b = static_cast<uint8_t>(pixel.b * brightnessScale);
				unsigned int color = (0xFF << 24) | (b << 16) | (g << 8) | r;

				float screenX = static_cast<float>(padding_ + x * (ledSize_ + ledGap_));
				float screenY = static_cast<float>(padding_ + y * (ledSize_ + ledGap_));

				// Draw LED as rounded rectangle
				DrawRectangleRounded(screenX, screenY,
				                     static_cast<float>(ledSize_), static_cast<float>(ledSize_),
				                     0.3f, 4, color);
			}
		}

		// Draw info text
		DrawText(TextFormat("%dx%d @ %dfps", width, height, GetFPS()), 10,
		         padding_ + ledHeight_ * (ledSize_ + ledGap_) + 5, 16, RAYLIB_DARKGRAY);

		EndDrawing();
	}

	void setBrightness(uint8_t brightness) override { brightness_ = brightness; }
	bool shouldQuit() override { return WindowShouldClose(); }

   private:
	uint16_t ledWidth_;
	uint16_t ledHeight_;
	int ledSize_;
	int ledGap_;
	int padding_;
	uint8_t brightness_;
};

// Global display for HAL
static hal::IDisplay* g_display = nullptr;

namespace hal {
IDisplay& getDisplay() {
	return *g_display;
}
}  // namespace hal

// Demo mode: cycle through effects
static void triggerDemoEffect(EffectProcessor& processor, int effectIndex) {
	JsonDocument props;

	switch (effectIndex % 4) {
		case 0: {
			// Pulse effect
			props["color"] = "random";
			props["duration"] = 800;
			props["fade"] = true;
			props["collapse"] = "random";
			processor.addEffect("pulse", props);
			printf("Triggered: pulse\n");
			break;
		}
		case 1: {
			// Wipe effect
			props["color"] = "cyan";
			props["duration"] = 300;
			props["direction"] = "random";
			processor.addEffect("wipe", props);
			printf("Triggered: wipe\n");
			break;
		}
		case 2: {
			// Explode effect
			props["color"] = "random";
			props["particleCount"] = 80;
			props["power"] = 60;
			props["lifespan"] = 1000;
			props["centerX"] = "random";
			props["centerY"] = "random";
			processor.addEffect("explode", props);
			printf("Triggered: explode\n");
			break;
		}
		case 3: {
			// Background effect
			props["color"] = "#111122";
			processor.addEffect("background", props);
			printf("Triggered: background\n");
			break;
		}
	}
}

int main(int argc, char* argv[]) {
	// Parse command line arguments
	uint16_t ledWidth = 32;
	uint16_t ledHeight = 8;
	std::string layout = "matrix-tl-h";

	if (argc >= 3) {
		ledWidth = static_cast<uint16_t>(atoi(argv[1]));
		ledHeight = static_cast<uint16_t>(atoi(argv[2]));
	}
	if (argc >= 4) {
		layout = argv[3];
	}

	printf("LED Simulator\n");
	printf("  Matrix: %dx%d\n", ledWidth, ledHeight);
	printf("  Layout: %s\n", layout.c_str());
	printf("\nControls:\n");
	printf("  SPACE - Trigger random effect\n");
	printf("  C     - Clear all effects\n");
	printf("  D     - Toggle auto-demo\n");
	printf("  Q/ESC - Quit\n\n");

	// Calculate window size
	int windowWidth = WINDOW_PADDING * 2 + ledWidth * (LED_SIZE + LED_GAP) - LED_GAP;
	int windowHeight = WINDOW_PADDING * 2 + ledHeight * (LED_SIZE + LED_GAP) - LED_GAP + 30;

	// Initialize raylib
	InitWindow(windowWidth, windowHeight, "RGFX LED Simulator");
	SetTargetFPS(120);

	// Create Matrix (same as ESP32)
	Matrix matrix(ledWidth, ledHeight, layout.c_str());
	if (!matrix.isValid()) {
		printf("ERROR: Failed to create matrix\n");
		CloseWindow();
		return 1;
	}

	// Initialize gamma LUT (defaults to linear 1.0 gamma)
	rebuildGammaLUT();

	// Create display backend
	g_display = new SimDisplay(ledWidth, ledHeight, LED_SIZE, LED_GAP, WINDOW_PADDING);

	// Create effect processor
	EffectProcessor processor(matrix, *g_display);

	// Demo mode state
	int effectIndex = 0;
	float timeSinceLastEffect = 0.0f;
	bool autoDemo = false;

	// Main loop
	while (!WindowShouldClose() && !g_display->shouldQuit()) {
		float deltaTime = GetFrameTime();
		timeSinceLastEffect += deltaTime;

		// Handle input
		if (IsKeyPressed(KEY_SPACE)) {
			triggerDemoEffect(processor, effectIndex++);
		}
		if (IsKeyPressed(KEY_C)) {
			processor.clearEffects();
			printf("Cleared all effects\n");
		}
		if (IsKeyPressed(KEY_D)) {
			autoDemo = !autoDemo;
			printf("Auto-demo: %s\n", autoDemo ? "ON" : "OFF");
		}
		if (IsKeyPressed(KEY_Q)) {
			break;
		}

		// Auto-demo mode
		if (autoDemo && timeSinceLastEffect > 2.0f) {
			triggerDemoEffect(processor, effectIndex++);
			timeSinceLastEffect = 0.0f;
		}

		// Update effects
		processor.update();

		// Drawing is handled by SimDisplay::show() called from processor.update()
	}

	// Cleanup
	delete g_display;
	CloseWindow();

	return 0;
}
