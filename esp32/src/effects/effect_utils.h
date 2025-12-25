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
