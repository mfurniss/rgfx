/**
 * LED Simulator - Native Effect Development Tool
 *
 * Runs the same effect code as ESP32 firmware but renders to a window
 * using raylib. Enables rapid iteration on effects without flashing hardware.
 *
 * Usage:
 *   ./led-sim <config.json>
 *
 * Example:
 *   ./led-sim ~/.rgfx/led-hardware/my-matrix.json
 */

// Include our headers FIRST to avoid raylib namespace conflicts
#include "graphics/matrix.h"
#include "graphics/downsample_to_matrix.h"
#include "effects/effect_processor.h"
#include "hal/display.h"
#include "hal/platform.h"
#include "hal/types.h"

// Local modules
#include "config.h"
#include "constants.h"
#include "demo.h"
#include "raylib_compat.h"
#include "sim_display.h"
#include "udp_listener.h"
#include "window.h"
#include "window_state.h"

#include <ArduinoJson.h>
#include <cstdio>
#include <cstdlib>
#include <ctime>

int main(int argc, char* argv[]) {
	// Seed rand() for random8/random16 (used by parseColor("random"))
	srand(static_cast<unsigned int>(time(nullptr)));

	// Require config file argument
	if (argc != 2) {
		printUsage(argv[0]);
		return 1;
	}

	// Load hardware config
	LedConfig config;
	if (!loadHardwareConfig(argv[1], config)) {
		return 1;
	}

	printf("LED Simulator\n");
	printf("  Dimensions: %dx%d\n", config.width, config.height);
	printf("  Layout: %s\n", config.layout.c_str());
	printf("\nControls:\n");
	printf("  1     - Pulse effect\n");
	printf("  2     - Wipe effect\n");
	printf("  3     - Explode effect\n");
	printf("  4     - Background effect\n");
	printf("  5     - Projectile effect\n");
	printf("  6     - Plasma effect (toggle)\n");
	printf("  C     - Clear all effects\n");
	printf("  D     - Toggle auto-demo\n");
	printf("  Q/ESC - Quit\n\n");

	// Initialize UDP listener for receiving effects from Hub
	UdpListener udpListener;
	if (!udpListener.init(8888)) {
		printf("Warning: UDP listener failed to start - keyboard input only\n");
	}

	// Calculate optimal window size for LED dimensions
	int windowWidth, windowHeight;
	float ledSize, ledGap;
	calculateWindowSize(config.width, config.height, windowWidth, windowHeight, ledSize, ledGap);

	// Check for saved window state
	WindowState savedState = loadWindowState();
	if (savedState.valid) {
		windowWidth = savedState.width;
		windowHeight = savedState.height;
	}

	printf("  Window: %dx%d, LED size: %.1f\n\n", windowWidth, windowHeight, ledSize);

	// Initialize raylib with calculated window size
	InitWindow(windowWidth, windowHeight, "RGFX LED Simulator");
	SetWindowState(FLAG_WINDOW_RESIZABLE);
	SetWindowMinSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
	SetTargetFPS(120);

	// Restore window position if saved
	if (savedState.valid) {
		SetWindowPosition(savedState.x, savedState.y);
	}

	// Create Matrix (same as ESP32)
	Matrix matrix(config.width, config.height, config.layout.c_str());
	if (!matrix.isValid()) {
		printf("ERROR: Failed to create matrix\n");
		CloseWindow();
		return 1;
	}

	// Initialize gamma LUT (defaults to linear 1.0 gamma)
	rebuildGammaLUT();

	// Create display backend with calculated sizing
	initDisplay(config.width, config.height, windowWidth, windowHeight, ledSize, ledGap);

	// Connect display to matrix for coordinate mapping (like FastLED.addLeds)
	static_cast<SimDisplay*>(&hal::getDisplay())->setMatrix(&matrix);

	// Create effect processor
	EffectProcessor processor(matrix, hal::getDisplay());

	// Demo mode state
	int autoEffectIndex = 1;
	float timeSinceLastEffect = 0.0f;
	bool autoDemo = false;

	// Main loop
	while (!WindowShouldClose() && !hal::getDisplay().shouldQuit()) {
		float deltaTime = GetFrameTime();
		timeSinceLastEffect += deltaTime;

		// Check for UDP packets from Hub
		char udpBuffer[1024];
		size_t bytesRead;
		while (udpListener.receive(udpBuffer, sizeof(udpBuffer), bytesRead)) {
			JsonDocument doc;
			DeserializationError err = deserializeJson(doc, udpBuffer, bytesRead);
			if (err == DeserializationError::Ok) {
				const char* effect = doc["effect"];
				if (effect) {
					JsonDocument props;
					props.set(doc["props"]);
					processor.addEffect(effect, props);
					printf("UDP: %s\n", effect);
				}
			} else {
				printf("UDP: JSON parse error: %s\n", err.c_str());
			}
		}

		// Handle input - number keys for specific effects
		if (IsKeyPressed(KEY_ONE)) {
			triggerDemoEffect(processor, 1);
		}
		if (IsKeyPressed(KEY_TWO)) {
			triggerDemoEffect(processor, 2);
		}
		if (IsKeyPressed(KEY_THREE)) {
			triggerDemoEffect(processor, 3);
		}
		if (IsKeyPressed(KEY_FOUR)) {
			triggerDemoEffect(processor, 4);
		}
		if (IsKeyPressed(KEY_FIVE)) {
			triggerDemoEffect(processor, 5);
		}
		if (IsKeyPressed(KEY_SIX)) {
			triggerDemoEffect(processor, 6);
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

		// Auto-demo mode - cycle through effects
		if (autoDemo && timeSinceLastEffect > 2.0f) {
			triggerDemoEffect(processor, autoEffectIndex);
			autoEffectIndex = (autoEffectIndex % 5) + 1;
			timeSinceLastEffect = 0.0f;
		}

		// Update effects
		processor.update();
	}

	// Save window state before exit
	RaylibVector2 pos = GetWindowPosition();
	saveWindowState(static_cast<int>(pos.x), static_cast<int>(pos.y), GetScreenWidth(), GetScreenHeight());

	// Cleanup
	cleanupDisplay();
	CloseWindow();

	return 0;
}
