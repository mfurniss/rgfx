#pragma once

#include <Arduino.h>

// Shared utility functions for effects

// Parse color from hex string (strips # prefix if present)
// Returns color as uint32_t
uint32_t parseColor(const char* colorHex);
