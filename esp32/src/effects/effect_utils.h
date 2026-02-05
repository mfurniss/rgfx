#pragma once

#include "hal/platform.h"
#include "hal/types.h"
#include <ArduinoJson.h>

// Shared utility functions for effects

// Parse color from hex string (strips # prefix if present)
// IMPORTANT: Caller must validate colorHex is not null before calling
uint32_t parseColor(const char* colorHex);

// Generate random color at full saturation and value
// Returns color as uint32_t (RGB format)
uint32_t randomColor();

/**
 * Compact RGB color storage used by effects.
 * Replaces repeated `uint8_t r, g, b` fields in effect structs.
 * Named RGBColor to avoid conflict with FastLED's RGB macro.
 */
struct RGBColor {
	uint8_t r, g, b;

	RGBColor() : r(0), g(0), b(0) {}
	RGBColor(uint8_t r, uint8_t g, uint8_t b) : r(r), g(g), b(b) {}

	// Construct from packed uint32_t (0xRRGGBB format)
	explicit RGBColor(uint32_t packed)
		: r((packed >> 16) & 0xFF), g((packed >> 8) & 0xFF), b(packed & 0xFF) {}

	// Pack to uint32_t (0xRRGGBB format)
	uint32_t pack() const { return (static_cast<uint32_t>(r) << 16) | (static_cast<uint32_t>(g) << 8) | b; }

	// Convert to FastLED CRGB
	operator CRGB() const { return CRGB(r, g, b); }
};

/**
 * Shared fade state management for effects that support fade in/out transitions.
 * Used by warp, plasma, and other effects with gradual enable/disable.
 */
enum class EnabledState : uint8_t { OFF, ON, FADE_IN, FADE_OUT };

struct FadeState {
	EnabledState enabledState = EnabledState::OFF;
	float fadeTime = 0.0f;
	uint8_t currentAlpha = 0;
	static constexpr float FADE_DURATION = 1.0f;

	static EnabledState parseEnabledState(const char* str);

	// Update alpha based on current enabledState and fadeTime
	void updateAlpha();

	// Update fade progress, returns true if effect is still active (not OFF)
	bool updateFade(float deltaTime);

	// Parse "enabled" prop from JSON (supports bool and string formats)
	// Returns the parsed EnabledState
	EnabledState parseEnabledProp(JsonDocument& props);

	// Start fade transition, calculating initial fadeTime from current alpha
	void startFade(EnabledState newState);

	bool isFullyOpaque() const { return currentAlpha == 255; }
	bool isOff() const { return enabledState == EnabledState::OFF; }
};
