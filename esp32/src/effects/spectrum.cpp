/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "spectrum.h"
#include "hal/platform.h"
#include "network/mqtt.h"

// Define static constexpr member
constexpr uint32_t SpectrumEffect::COLUMN_COLORS[];

SpectrumEffect::SpectrumEffect(const Matrix& /* m */, Canvas& c)
    : canvas(c), decayRate(2.1f) {
	columns.reserve(16);
}

void SpectrumEffect::assignColumnColor(Column& col, size_t index, size_t totalColumns) {
	// Spread colors across available palette based on column position
	size_t colorIndex = (index * COLOR_COUNT) / totalColumns;
	if (colorIndex >= COLOR_COUNT) colorIndex = COLOR_COUNT - 1;

	uint32_t color = COLUMN_COLORS[colorIndex];
	col.r = (color >> 16) & 0xFF;
	col.g = (color >> 8) & 0xFF;
	col.b = color & 0xFF;
}

void SpectrumEffect::add(JsonDocument& props) {
	if (!props["values"].is<JsonArray>()) {
		hal::log("ERROR: spectrum missing 'values' array");
		publishError("spectrum", "missing 'values' array", props);
		return;
	}

	JsonArray values = props["values"].as<JsonArray>();
	size_t newCount = values.size();

	if (newCount == 0) {
		return;
	}

	// Parse optional decay rate
	if (props["decayRate"].is<float>()) {
		decayRate = props["decayRate"].as<float>();
	}

	// Handle column count changes
	size_t oldCount = columns.size();

	if (newCount != oldCount) {
		columns.resize(newCount);

		// Assign colors to all columns based on new count
		for (size_t i = 0; i < newCount; i++) {
			assignColumnColor(columns[i], i, newCount);
			if (i >= oldCount) {
				columns[i].currentValue = 0.0f;
				columns[i].holdTime = 0.0f;
			}
		}
	}

	// Update column values - only increase if new value is higher
	size_t i = 0;
	for (JsonVariant val : values) {
		if (i >= columns.size()) break;

		// Convert 0-9 to 0.0-1.0 (normalized height)
		int rawValue = val.as<int>();
		if (rawValue < 0) rawValue = 0;
		if (rawValue > 9) rawValue = 9;
		float normalizedValue = rawValue / 9.0f;

		// Only update if new value is higher (peak hold behavior)
		if (normalizedValue >= columns[i].currentValue) {
			columns[i].currentValue = normalizedValue;
			columns[i].holdTime = HOLD_DURATION;  // Reset hold timer
		}
		i++;
	}
}

void SpectrumEffect::update(float deltaTime) {
	for (auto& col : columns) {
		// Decrement hold time first
		if (col.holdTime > 0.0f) {
			col.holdTime -= deltaTime;
			continue;  // Don't decay while holding
		}

		// Apply decay after hold expires
		col.currentValue -= decayRate * deltaTime;
		if (col.currentValue < 0.0f) {
			col.currentValue = 0.0f;
		}
	}
}

void SpectrumEffect::render() {
	if (columns.empty()) {
		return;
	}

	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();
	size_t columnCount = columns.size();

	// Calculate column width snapped to LED boundaries
	// Canvas is at 4x resolution, so divide to get physical LED width, then multiply back
	uint16_t colWidthPixels = (canvasWidth / columnCount / 4) * 4;
	if (colWidthPixels < 4) colWidthPixels = 4;  // Minimum 1 physical LED

	// Draw width leaves 1 LED (4 pixels) for black separator on right
	uint16_t drawWidth = (colWidthPixels > 4) ? colWidthPixels - 4 : colWidthPixels;

	for (size_t i = 0; i < columnCount; i++) {
		const Column& col = columns[i];

		// Calculate column X position
		uint16_t x = static_cast<uint16_t>(i * colWidthPixels);

		// Calculate column height based on normalized value
		uint16_t colHeight = static_cast<uint16_t>(col.currentValue * canvasHeight);
		if (colHeight == 0) continue;

		// Draw from bottom up (y=0 is top in canvas coordinates)
		uint16_t y = canvasHeight - colHeight;

		// Draw the colored column (70% luminosity)
		CRGBA color(col.r * 0.7f, col.g * 0.7f, col.b * 0.7f, 255);
		canvas.drawRectangle(x, y, drawWidth, colHeight, color, BlendMode::ADDITIVE);

		// Draw black separator on right edge (1 LED wide)
		if (colWidthPixels > 4) {
			CRGBA black(0, 0, 0, 255);
			canvas.drawRectangle(x + drawWidth, y, 4, colHeight, black, BlendMode::REPLACE);
		}
	}
}

void SpectrumEffect::reset() {
	columns.clear();
}
