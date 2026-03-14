#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "utils/easing.h"

class BitmapEffect : public IEffect {
   private:
	// Shatter mode for Robotron-style strip explosion
	enum class ShatterMode : uint8_t { NONE, HORIZONTAL, VERTICAL };

	// Memory limits
	static constexpr uint8_t MAX_FRAMES_PER_BITMAP = 32;
	static constexpr uint8_t MAX_FRAME_DIMENSION = 32;
	static constexpr size_t MAX_BITMAP_MEMORY = 131072;  // 128KB total budget
	static constexpr size_t MIN_FREE_HEAP = 32768;       // 32KB safety margin

	// Animation frame with palettized pixel data
	struct Frame {
		std::vector<uint8_t> indices;  // Palette indices, row-major (0xFF = transparent)
		uint8_t width;                 // Frame width in pixels
		uint8_t height;                // Frame height in pixels
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
		CRGBA palette[16];               // Color palette for this bitmap
		uint8_t paletteSize;             // Number of colors in palette
		ShatterMode shatter;             // Strip explosion direction (NONE = normal)
		size_t memoryUsed;               // Memory used by this bitmap (for tracking)
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
	size_t totalMemoryUsed = 0;  // Track total memory used by all bitmaps

	// Separate render path for shatter effect (keeps normal path optimized)
	void renderShatter(const Bitmap& bmp, const Frame& frame,
	                   int16_t offsetX, int16_t offsetY,
	                   uint8_t fadeAlpha, uint8_t scale);

	// Helper to estimate memory needed for a bitmap before parsing
	size_t estimateBitmapMemory(JsonDocument& props);

	// Helper to calculate actual memory used by a parsed bitmap
	size_t calculateBitmapMemory(const Bitmap& bitmap);

   public:
	BitmapEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;

	// Expose for testing
	size_t getTotalMemoryUsed() const { return totalMemoryUsed; }
	size_t getBitmapCount() const { return bitmaps.size(); }
};
