#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

// Shared utility functions for effects

// Parse color from hex string (strips # prefix if present)
// Returns color as uint32_t
uint32_t parseColor(const char* colorHex);

// Validate and extract color from props with logging
// Returns parsed color or defaultColor if invalid
uint32_t validateColor(JsonDocument& props, const char* propName, uint32_t defaultColor);
