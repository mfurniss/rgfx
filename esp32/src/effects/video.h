#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

/**
 * Video Effect
 *
 * Receives pre-transcoded RGB24 frames from the Hub via a dedicated UDP channel.
 * Renders at the background/plasma layer so other effects composite on top.
 * Frame data is managed by udp_video.h — this effect reads the front buffer.
 *
 * Controlled via JSON UDP: {"effect":"video","props":{"action":"start"|"stop"}}
 * Frame data arrives as binary on the shared UDP_PORT (distinguished by VIDEO_MAGIC byte).
 */
class VideoEffect : public IEffect {
   private:
	Canvas& canvas;
	Matrix& matrix;
	bool active;
	uint32_t activatedAt;

   public:
	VideoEffect(Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	bool isActive() const { return active; }
};
