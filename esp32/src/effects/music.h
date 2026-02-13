/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#pragma once

#include <cstddef>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "graphics/matrix.h"

class MusicEffect : public IEffect {
   private:
	struct Note {
		uint16_t life;    // Fixed 0.16: 0=dead, 65535=full height
		uint8_t pitch;    // Raw pitch value 0-255 (X computed at render time)
		uint8_t r, g, b;  // Color from channel hue
	};

	struct Peak {
		uint16_t height;     // Fixed 0.16: 0-65535 normalized height
		uint16_t holdTimer;  // Milliseconds remaining at peak before falling
	};

	static constexpr size_t BUFFER_SIZE = 128;
	static constexpr size_t MAX_CHANNELS = 64;
	static constexpr size_t MAX_SLOTS = 128;
	static constexpr uint16_t PEAK_HOLD_MS = 500;
	static constexpr uint16_t PEAK_FALL_PER_MS = 66;  // 65535 / 1000 ≈ 66
	static constexpr uint32_t IDLE_RESET_MS = 5000;
	static constexpr uint16_t LIFE_MAX = 65535;

	// HSV LUT: full-saturation, full-brightness hues (computed once)
	static CRGB hsvLut[256];
	static bool hsvLutReady;

	// Hex digit LUT: ASCII char → 0-15 or -1 for invalid
	static const int8_t HEX_LUT[128];

	Note buffer[BUFFER_SIZE];
	size_t head;
	const Matrix& matrix;
	Canvas& canvas;
	float decayRate;

	int minPitch;  // Lowest observed pitch (auto-scaling)
	int maxPitch;  // Highest observed pitch (auto-scaling)

	// Per-channel color cache (recomputed when channel count changes)
	uint8_t channelColors[MAX_CHANNELS][3];
	size_t lastChannelCount;

	Peak peaks[MAX_SLOTS];
	uint32_t idleMs;      // Idle timer in milliseconds
	uint32_t hueAccum;    // Hue offset in 16.16 fixed-point (upper 8 of integer = hue)

	static void initHsvLut();
	void updateChannelColors(size_t channelCount);

   public:
	MusicEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	// Exposed for testing
	static int hexToPitch(const char* pair);
	static uint16_t pitchToX(int pitch, int minPitch, int maxPitch, uint16_t canvasWidth);
};
