#pragma once

#include "hal/platform.h"
#include <ArduinoJson.h>

// Shared utility functions for effects

// Parse color from hex string (strips # prefix if present)
// IMPORTANT: Caller must validate colorHex is not null before calling
uint32_t parseColor(const char* colorHex);

// Generate random color at full saturation and value
// Returns color as uint32_t (RGB format)
uint32_t randomColor();

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
