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
		uint8_t pitch;    // Raw pitch value 0-255 (X computed at render time)
		float life;       // 1.0 = full height, decays to 0
		uint8_t r, g, b;  // Color from channel hue
	};

	static constexpr size_t BUFFER_SIZE = 128;
	static constexpr size_t MAX_CHANNELS = 64;

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
