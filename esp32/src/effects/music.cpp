#include "music.h"
#include "hal/platform.h"
#include "network/mqtt.h"
#include <cstring>

// Static member definitions
CRGB MusicEffect::hsvLut[256];
bool MusicEffect::hsvLutReady = false;

// Hex digit LUT: maps ASCII 0-127 to hex value (0-15) or -1 for invalid
const int8_t MusicEffect::HEX_LUT[128] = {
	-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 0-15
	-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 16-31
	-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 32-47
	 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,-1,-1,-1,-1,-1,-1,  // 48-63  '0'-'9'
	-1,10,11,12,13,14,15,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 64-79  'A'-'F'
	-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 80-95
	-1,10,11,12,13,14,15,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 96-111 'a'-'f'
	-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,  // 112-127
};

void MusicEffect::initHsvLut() {
	if (hsvLutReady) return;
	for (int i = 0; i < 256; i++) {
		hsvLut[i] = hsvToRgb(CHSV(static_cast<uint8_t>(i), 255, 255));
	}
	hsvLutReady = true;
}

MusicEffect::MusicEffect(const Matrix& m, Canvas& c)
	: head(0), matrix(m), canvas(c), decayRate(2.0f), minPitch(255), maxPitch(0),
	  lastChannelCount(0), idleMs(0), hueAccum(0) {
	memset(buffer, 0, sizeof(buffer));
	memset(channelColors, 0, sizeof(channelColors));
	memset(peaks, 0, sizeof(peaks));
	initHsvLut();
}

int MusicEffect::hexToPitch(const char* pair) {
	if (pair[0] == '.' && pair[1] == '.')
		return -1;
	uint8_t c0 = static_cast<uint8_t>(pair[0]);
	uint8_t c1 = static_cast<uint8_t>(pair[1]);
	if (c0 > 127 || c1 > 127)
		return -1;
	int8_t hi = HEX_LUT[c0];
	int8_t lo = HEX_LUT[c1];
	if (hi < 0 || lo < 0)
		return -1;
	return (hi << 4) | lo;
}

uint16_t MusicEffect::pitchToX(int pitch, int minPitch, int maxPitch, uint16_t canvasWidth) {
	if (pitch < 0)
		return 0;
	int maxSlot = canvasWidth / 8 - 2;
	if (maxSlot < 0) maxSlot = 0;
	int slot;
	if (minPitch >= maxPitch) {
		slot = maxSlot / 2;
	} else {
		// Integer math: slot = (pitch - min) * maxSlot / range
		slot = (pitch - minPitch) * maxSlot / (maxPitch - minPitch);
		if (slot > maxSlot) slot = maxSlot;
	}
	return static_cast<uint16_t>(slot) * 8;
}

void MusicEffect::updateChannelColors(size_t channelCount) {
	if (channelCount == 0 || channelCount > MAX_CHANNELS)
		return;

	uint8_t hueIndex = static_cast<uint8_t>(hueAccum >> 16);
	for (size_t i = 0; i < channelCount; i++) {
		uint8_t hue = static_cast<uint8_t>((i * 256) / channelCount + hueIndex);
		const CRGB& rgb = hsvLut[hue];
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

	idleMs = 0;

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

	updateChannelColors(channelCount);

	size_t ch = 0;
	size_t pos = 0;
	while (pos + 1 < len && ch < channelCount) {
		int pitch = hexToPitch(str + pos);
		if (pitch >= 0) {
			if (pitch < minPitch) minPitch = pitch;
			if (pitch > maxPitch) maxPitch = pitch;

			Note& note = buffer[head];
			note.pitch = static_cast<uint8_t>(pitch);
			note.life = LIFE_MAX;
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
	// Pre-compute fixed-point decay for this frame
	uint32_t decayWide = static_cast<uint32_t>(decayRate * deltaTime * 65535.0f);
	uint16_t decay = decayWide > LIFE_MAX ? LIFE_MAX : static_cast<uint16_t>(decayWide);
	if (decay == 0) decay = 1;

	for (size_t i = 0; i < BUFFER_SIZE; i++) {
		if (buffer[i].life > 0) {
			buffer[i].life = (buffer[i].life <= decay) ? 0 : buffer[i].life - decay;
		}
	}

	uint16_t dtMs = static_cast<uint16_t>(deltaTime * 1000.0f);

	idleMs += dtMs;
	if (idleMs >= IDLE_RESET_MS) {
		minPitch = 255;
		maxPitch = 0;
	}

	// 256 hues / 120 seconds in 16.16 fixed-point = ~139810 per second
	hueAccum += static_cast<uint32_t>(deltaTime * 139810.0f);

	// Pre-compute peak fall for this frame
	uint32_t peakFallWide = static_cast<uint32_t>(deltaTime * 65535.0f);
	uint16_t peakFall = peakFallWide > LIFE_MAX ? LIFE_MAX : static_cast<uint16_t>(peakFallWide);

	for (size_t s = 0; s < MAX_SLOTS; s++) {
		if (peaks[s].height == 0) continue;
		if (peaks[s].holdTimer > 0) {
			if (peaks[s].holdTimer <= dtMs) {
				// Hold expired — apply excess time to falling
				uint16_t excessMs = dtMs - peaks[s].holdTimer;
				peaks[s].holdTimer = 0;
				uint32_t excessFall =
					static_cast<uint32_t>(excessMs) * PEAK_FALL_PER_MS;
				peaks[s].height = (peaks[s].height <= excessFall)
					? 0 : peaks[s].height - static_cast<uint16_t>(excessFall);
			} else {
				peaks[s].holdTimer -= dtMs;
			}
		} else {
			peaks[s].height = (peaks[s].height <= peakFall)
				? 0 : peaks[s].height - peakFall;
		}
	}
}

void MusicEffect::render() {
	uint16_t canvasWidth = canvas.getWidth();
	uint16_t canvasHeight = canvas.getHeight();

	// Pre-compute pitch-to-slot reciprocal
	int maxSlot = canvasWidth / 8 - 2;
	if (maxSlot < 0) maxSlot = 0;
	uint16_t range = (maxPitch > minPitch)
		? static_cast<uint16_t>(maxPitch - minPitch) : 0;
	// Ceiling-biased reciprocal so max pitch maps exactly to maxSlot
	uint32_t slotRecip = (range > 0)
		? ((static_cast<uint32_t>(maxSlot) << 16) + range - 1) / range : 0;

	uint16_t slotHeight[MAX_SLOTS] = {};

	for (size_t i = 0; i < BUFFER_SIZE; i++) {
		const Note& note = buffer[i];
		if (note.life == 0)
			continue;

		// +1 compensates for 0.16 fixed-point: 65535 must map to full canvasHeight
		uint16_t height = static_cast<uint16_t>(
			((static_cast<uint32_t>(note.life) + 1) * canvasHeight) >> 16);
		if (height == 0)
			continue;

		// Integer pitch-to-X using pre-computed reciprocal
		int slot;
		if (range == 0) {
			slot = maxSlot / 2;
		} else {
			slot = static_cast<int>(
				(static_cast<uint32_t>(note.pitch - minPitch) * slotRecip) >> 16);
			if (slot > maxSlot) slot = maxSlot;
		}
		uint16_t x = static_cast<uint16_t>(slot) * 8;
		uint16_t y = canvasHeight - height;
		CRGBA color(note.r, note.g, note.b, 255);
		canvas.drawRectangle(x, y, static_cast<uint16_t>(8), height, color,
		                     BlendMode::ADDITIVE);

		size_t slotIdx = static_cast<size_t>(slot);
		if (slotIdx < MAX_SLOTS && note.life > slotHeight[slotIdx])
			slotHeight[slotIdx] = note.life;
	}

	// Update and render VU-meter peak indicators
	for (int s = 0; s <= maxSlot && s < static_cast<int>(MAX_SLOTS); s++) {
		if (slotHeight[s] > peaks[s].height) {
			peaks[s].height = slotHeight[s];
			peaks[s].holdTimer = PEAK_HOLD_MS;
		}
		if (peaks[s].height == 0) continue;

		uint16_t peakH = static_cast<uint16_t>(
			((static_cast<uint32_t>(peaks[s].height) + 1) * canvasHeight) >> 16);
		if (peakH == 0) continue;
		peakH = (peakH / 4) * 4;
		if (peakH == 0) continue;
		uint16_t peakY = canvasHeight - peakH;

		CRGBA peakColor(96, 96, 96, 255);
		canvas.drawRectangle(static_cast<uint16_t>(s * 8), peakY,
		                     static_cast<uint16_t>(8), static_cast<uint16_t>(4),
		                     peakColor, BlendMode::ADDITIVE);
	}
}

void MusicEffect::reset() {
	memset(buffer, 0, sizeof(buffer));
	memset(peaks, 0, sizeof(peaks));
	head = 0;
	minPitch = 255;
	maxPitch = 0;
}
