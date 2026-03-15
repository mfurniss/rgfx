#include "video.h"
#include "network/udp_video.h"
#include "log.h"
#include "hal/platform.h"
#include <cstring>
#include <cstdio>

VideoEffect::VideoEffect(Matrix& m, Canvas& c)
	: canvas(c), matrix(m), active(false), activatedAt(0), lastFrame(nullptr) {}

void VideoEffect::add(JsonDocument& props) {
	const char* action = props["action"] | "";
	if (strcmp(action, "start") == 0) {
		active = true;
		activatedAt = hal::millis();
		setVideoFrameSize(matrix.width, matrix.height);
		char buf[64];
		snprintf(buf, sizeof(buf), "Video effect started (%dx%d)",
		         matrix.width, matrix.height);
		log(buf);
	} else if (strcmp(action, "stop") == 0) {
		active = false;
		log("Video effect stopped");
	}
}

void VideoEffect::update(float /* deltaTime */) {
	if (!active) return;

	// Auto-deactivate if no frames received recently.
	// Only check after at least one frame has arrived since activation.
	uint32_t lastFrame = getLastVideoFrameTime();
	if (lastFrame >= activatedAt && (hal::millis() - lastFrame) > VIDEO_FRAME_TIMEOUT_MS) {
		active = false;
		char buf[64];
		snprintf(buf, sizeof(buf),
		         "Video: auto-deactivated (no frames for %ums)",
		         VIDEO_FRAME_TIMEOUT_MS);
		log(buf);
	}
}

void VideoEffect::render() {
	if (!active) return;

	// Consume a new frame if available, otherwise repaint from cached pointer.
	// The canvas is cleared every frame by the effect processor, so we must
	// repaint on every render call — but we only advance lastFrame when new
	// data has actually arrived, avoiding peek/consume overhead on stale frames
	// (e.g., 30 FPS video source in a 120 FPS render loop).
	if (hasNewVideoFrame()) {
		lastFrame = peekVideoFrame();
		consumeVideoFrame();
	}

	if (!lastFrame) return;

	uint16_t matrixW = matrix.width;
	uint16_t matrixH = matrix.height;

	// Running src pointer eliminates per-pixel multiply for offset calculation.
	const uint8_t* src = lastFrame;
	for (uint16_t my = 0; my < matrixH; my++) {
		for (uint16_t mx = 0; mx < matrixW; mx++) {
			canvas.fillBlock4x4(mx * 4, my * 4, CRGB(src[0], src[1], src[2]));
			src += 3;
		}
	}
}

void VideoEffect::reset() {
	active = false;
	lastFrame = nullptr;
}
