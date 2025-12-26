/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

class SpectrumEffect : public IEffect {
   private:
	struct Column {
		float currentValue;  // Current display height (0.0 to 1.0, normalized)
		float holdTime;      // Time remaining before decay starts (seconds)
		uint8_t r, g, b;     // Column color
	};

	static constexpr float HOLD_DURATION = 0.1f;  // Hold time before decay (seconds)

	std::vector<Column> columns;
	Canvas& canvas;
	float decayRate;  // How fast columns fall (units per second)

	// 12-color rainbow palette
	static constexpr uint32_t COLUMN_COLORS[] = {
	    0xFF0000,  // Red
	    0xFF8000,  // Orange
	    0xFFFF00,  // Yellow
	    0x80FF00,  // Yellow-Green
	    0x00FF00,  // Green
	    0x00FF80,  // Cyan-Green
	    0x00FFFF,  // Cyan
	    0x0080FF,  // Light Blue
	    0x0000FF,  // Blue
	    0x8000FF,  // Purple
	    0xFF00FF,  // Magenta
	    0xFF0080,  // Pink
	};
	static constexpr size_t COLOR_COUNT = 12;

	void assignColumnColor(Column& col, size_t index, size_t totalColumns);

   public:
	SpectrumEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
