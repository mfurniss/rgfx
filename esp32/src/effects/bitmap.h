#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "utils/easing.h"

class BitmapEffect : public IEffect {
   private:
	// Animation frame with its own pixel data and dimensions
	struct Frame {
		std::vector<CRGBA> pixels;  // Pre-computed RGBA pixels, row-major order
		uint8_t width;              // Frame width in pixels
		uint8_t height;             // Frame height in pixels
	};

	struct Bitmap {
		uint32_t duration;               // Total duration in milliseconds
		uint32_t elapsedTime;            // Elapsed time in milliseconds
		std::vector<Frame> frames;       // Animation frames
		uint8_t frameRate;               // Frames per second (default 2)
		float centerX;                   // Center X position in canvas coords (snapped to LED)
		float centerY;                   // Center Y position in canvas coords (snapped to LED)
		float endX;                      // End X position in canvas coords (snapped to LED)
		float endY;                      // End Y position in canvas coords (snapped to LED)
		bool hasEndPosition;             // True if movement animation enabled
		EasingFunction easing;           // Easing function for movement
		uint32_t fadeInMs;               // Fade in duration in milliseconds (0 = disabled)
		uint32_t fadeOutMs;              // Fade out duration in milliseconds (0 = disabled)
		uint32_t remaining() const { return duration - elapsedTime; }

		// Get current frame index based on elapsed time and frame rate
		size_t currentFrameIndex() const {
			if (frames.size() <= 1 || frameRate == 0) return 0;
			uint32_t frameDurationMs = 1000 / frameRate;
			return (elapsedTime / frameDurationMs) % frames.size();
		}
	};

	std::vector<Bitmap> bitmaps;
	const Matrix& matrix;
	Canvas& canvas;

   public:
	BitmapEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
