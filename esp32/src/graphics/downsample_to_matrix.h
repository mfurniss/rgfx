#pragma once

#include "matrix.h"
#include "canvas.h"
#include "hal/types.h"
#include <cmath>

#ifdef ESP32
#include "driver_config.h"
#else
// Native build: driver_config.h from hal/native/ is used via include path
#include "driver_config.h"
#endif

// Gamma correction lookup tables (256 bytes each, generated from gamma values)
// These are rebuilt when config changes via rebuildGammaLUT()
extern uint8_t g_gammaLutR[256];
extern uint8_t g_gammaLutG[256];
extern uint8_t g_gammaLutB[256];

// Rebuild gamma lookup tables from current config
// Call this after receiving new gamma/floor values from Hub
inline void rebuildGammaLUT() {
	float gammaR = g_driverConfig.gammaR;
	float gammaG = g_driverConfig.gammaG;
	float gammaB = g_driverConfig.gammaB;
	uint8_t floorR = g_driverConfig.floorR;
	uint8_t floorG = g_driverConfig.floorG;
	uint8_t floorB = g_driverConfig.floorB;

	for (int i = 0; i < 256; i++) {
		float normalized = i / 255.0f;
		uint8_t correctedR = (uint8_t)(powf(normalized, gammaR) * 255.0f + 0.5f);
		uint8_t correctedG = (uint8_t)(powf(normalized, gammaG) * 255.0f + 0.5f);
		uint8_t correctedB = (uint8_t)(powf(normalized, gammaB) * 255.0f + 0.5f);

		// Apply floor cutoff: values at or below floor become 0
		g_gammaLutR[i] = (correctedR <= floorR) ? 0 : correctedR;
		g_gammaLutG[i] = (correctedG <= floorG) ? 0 : correctedG;
		g_gammaLutB[i] = (correctedB <= floorB) ? 0 : correctedB;
	}
}

// Downsample a single canvas to the LED matrix.
// Canvas is 4x the matrix resolution for supersampling.
// Applies gamma correction using precomputed lookup tables.
// Defined in downsample_to_matrix.cpp with IRAM_ATTR to keep the hot-path
// function body in IRAM and avoid flash instruction-cache pressure.
void downsampleToMatrix(Canvas& canvas, Matrix* matrix);
