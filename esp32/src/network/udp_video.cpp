#include "network/udp_video.h"
#include "log.h"
#include <cstring>

// Double buffer for frame reassembly
static uint8_t* frontBuffer = nullptr;
static uint8_t* backBuffer = nullptr;
static size_t frameSize = 0;  // W * H * 3 (set by setVideoFrameSize)

// Stats
static uint32_t framesCompleted = 0;
static uint32_t lastStatsLogMs = 0;
static uint32_t packetsReceived = 0;

// Reassembly state
static uint16_t currentSequence = 0xFFFF;  // Sequence being reassembled
static size_t bytesReceived = 0;           // Bytes received for current frame
static bool frameReady = false;            // New frame available in front buffer
static uint32_t lastFrameTimeMs = 0;       // Timestamp of last complete frame

void setVideoFrameSize(uint16_t width, uint16_t height) {
	size_t newSize = static_cast<size_t>(width) * height * 3;
	if (newSize > VIDEO_MAX_FRAME_SIZE) {
		log("Video: Frame size too large (" + String(newSize) + " bytes, max " +
		    String(VIDEO_MAX_FRAME_SIZE) + ")", LogLevel::ERROR);
		return;
	}

	// Reallocate buffers if size changed
	if (newSize != frameSize) {
		delete[] frontBuffer;
		delete[] backBuffer;
		frontBuffer = new uint8_t[newSize]();
		backBuffer = new uint8_t[newSize]();
		frameSize = newSize;
		log("Video: Frame buffer allocated (" + String(width) + "x" + String(height) +
		    " = " + String(newSize) + " bytes x2)");
	}
}

static bool firstPacketLogged = false;

void handleVideoPacket(const uint8_t* data, size_t length) {
	if (length < VIDEO_HEADER_SIZE) {
		return;
	}

	// Parse header (big-endian)
	uint8_t magic = data[0];
	if (magic != VIDEO_MAGIC) {
		return;
	}

	uint8_t flags = data[1];
	uint16_t sequence = (data[2] << 8) | data[3];
	uint16_t totalSize = (data[4] << 8) | data[5];
	uint16_t fragmentOffset = (data[6] << 8) | data[7];
	bool lastFragment = (flags & VIDEO_FLAG_LAST_FRAGMENT) != 0;

	if (!firstPacketLogged) {
		firstPacketLogged = true;
		log("Video: first packet received (len=" + String(length) +
		    " totalSize=" + String(totalSize) +
		    " frameSize=" + String(frameSize) +
		    " seq=" + String(sequence) +
		    " offset=" + String(fragmentOffset) +
		    " last=" + String(lastFragment ? "Y" : "N") + ")");
	}

	if (frameSize == 0) {
		return;
	}

	// Validate total size matches expected frame size
	if (totalSize != frameSize) {
		return;
	}

	// New sequence? Reset reassembly state
	if (sequence != currentSequence) {
		currentSequence = sequence;
		bytesReceived = 0;
	}

	// Copy payload into back buffer at the correct offset
	size_t payloadSize = length - VIDEO_HEADER_SIZE;
	if (fragmentOffset + payloadSize > frameSize) {
		return;
	}

	memcpy(backBuffer + fragmentOffset, data + VIDEO_HEADER_SIZE, payloadSize);
	bytesReceived += payloadSize;
	packetsReceived++;

	// Frame complete?
	if (lastFragment && bytesReceived >= frameSize) {
		// Swap buffers
		uint8_t* temp = frontBuffer;
		frontBuffer = backBuffer;
		backBuffer = temp;
		frameReady = true;
		lastFrameTimeMs = millis();
		framesCompleted++;

		if (framesCompleted == 1) {
			log("Video: first frame received (" + String(frameSize) + " bytes)");
		}

		// Reset for next frame
		currentSequence = 0xFFFF;
		bytesReceived = 0;
	}

	// Log stats once per second while active
	uint32_t nowMs = millis();
	if (framesCompleted > 0 && (nowMs - lastStatsLogMs) >= 1000) {
		log("Video UDP: packets=" + String(packetsReceived) + " frames=" + String(framesCompleted));
		lastStatsLogMs = nowMs;
	}
}

const uint8_t* getVideoFrame() {
	frameReady = false;
	return frontBuffer;
}

bool hasNewVideoFrame() {
	return frameReady;
}

uint32_t getLastVideoFrameTime() {
	return lastFrameTimeMs;
}
