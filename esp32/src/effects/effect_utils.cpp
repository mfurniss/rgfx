#include "effect_utils.h"

uint32_t parseColor(const char* colorHex) {
	if (colorHex[0] == '#') {
		colorHex++;  // Skip # prefix
	}
	return (uint32_t)strtol(colorHex, NULL, 16);
}
