/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "music.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

MusicEffect::MusicEffect(const Matrix& m, Canvas& c)
	: head(0), matrix(m), canvas(c), decayRate(2.0f), minPitch(255), maxPitch(0),
	  lastChannelCount(0) {
	memset(buffer, 0, sizeof(buffer));
	memset(channelColors, 0, sizeof(channelColors));
}

int MusicEffect::hexToPitch(const char* pair) {
	if (pair[0] == '.' && pair[1] == '.')
		return -1;
	auto hexDigit = [](char c) -> int {
		if (c >= '0' && c <= '9') return c - '0';
		if (c >= 'A' && c <= 'F') return c - 'A' + 10;
		if (c >= 'a' && c <= 'f') return c - 'a' + 10;
		return -1;
	};
	int hi = hexDigit(pair[0]);
	int lo = hexDigit(pair[1]);
	if (hi < 0 || lo < 0)
		return -1;
	return (hi << 4) | lo;
}

uint16_t MusicEffect::pitchToX(int pitch, int minPitch, int maxPitch, uint16_t canvasWidth) {
	if (pitch < 0)
		return 0;
	float normalized;
	if (minPitch >= maxPitch)
		normalized = 0.5f;
	else
		normalized = static_cast<float>(pitch - minPitch) / (maxPitch - minPitch);
	// Map to 2-LED-wide bar slots. Truncation keeps uniform spacing for
	// equally-spaced pitches, pushing any leftover space to the right edge.
	int maxSlot = canvasWidth / 8 - 2;
	if (maxSlot < 0) maxSlot = 0;
	int slot = static_cast<int>(normalized * maxSlot);
	if (slot > maxSlot) slot = maxSlot;
	return static_cast<uint16_t>(slot) * 8;
}

void MusicEffect::updateChannelColors(size_t channelCount) {
	if (channelCount == 0 || channelCount > MAX_CHANNELS)
		return;

	for (size_t i = 0; i < channelCount; i++) {
		uint8_t hue = static_cast<uint8_t>((i * 256) / channelCount);
		CRGB rgb = CHSV(hue, 255, 255);
		channelColors[i][0] = rgb.r;
		channelColors[i][1] = rgb.g;
		channelColors[i][2] = rgb.b;
	}
	lastChannelCount = channelCount;
}

void MusicEffect::add(JsonDocument& props) {
	// Matrix-only effect
	if (matrix.layoutType == LayoutType::STRIP) {
		return;
	}

	if (!props["channels"].is<const char*>()) {
		hal::log("ERROR: music missing 'channels' string");
		publishError("music", "missing 'channels' string", props);
		return;
	}

	const char* str = props["channels"].as<const char*>();
	size_t len = strlen(str);
	if (len < 2) {
		return;
	}

	if (props["decayRate"].is<float>()) {
		decayRate = props["decayRate"].as<float>();
	}

	// Count channels (pipe-delimited: "FF|..|A0" = 3 channels)
	size_t channelCount = 1;
	for (size_t i = 0; i < len; i++) {
		if (str[i] == '|') channelCount++;
	}
	if (channelCount > MAX_CHANNELS) {
		return;
	}

	if (channelCount != lastChannelCount) {
		updateChannelColors(channelCount);
	}

	size_t ch = 0;
	size_t pos = 0;
	while (pos + 1 < len && ch < channelCount) {
		int pitch = hexToPitch(str + pos);
		if (pitch >= 0) {
			if (pitch < minPitch) minPitch = pitch;
			if (pitch > maxPitch) maxPitch = pitch;

			Note& note = buffer[head];
			note.pitch = static_cast<uint8_t>(pitch);
			note.life = 1.0f;
			note.r = channelColors[ch][0];
			note.g = channelColors[ch][1];
			note.b = channelColors[ch][2];
			head = (head + 1) % BUFFER_SIZE;
		}
		// Skip past hex pair and pipe separator
		pos += 3;
		ch++;
	}
}

void MusicEffect::update(float deltaTime) {
	for (size_t i = 0; i < BUFFER_SIZE; i++) {
		if (buffer[i].life > 0.0f) {
			buffer[i].life -= decayRate * deltaTime;
		}
	}
}

void MusicEffect::render() {
	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	for (size_t i = 0; i < BUFFER_SIZE; i++) {
		const Note& note = buffer[i];
		if (note.life <= 0.0f)
			continue;

		uint16_t height = static_cast<uint16_t>(note.life * canvasHeight);
		if (height == 0)
			continue;

		uint16_t x = pitchToX(note.pitch, minPitch, maxPitch, canvasWidth);
		uint16_t y = canvasHeight - height;
		CRGBA color(note.r, note.g, note.b, 255);
		canvas.drawRectangle(x, y, static_cast<uint16_t>(8), height, color,
		                     BlendMode::ADDITIVE);
	}
}

void MusicEffect::reset() {
	memset(buffer, 0, sizeof(buffer));
	head = 0;
	minPitch = 255;
	maxPitch = 0;
}
