#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "utils/easing.h"

class BitmapEffect : public IEffect {
   private:
	struct Bitmap {
		uint32_t duration;               // Total duration in milliseconds
		uint32_t elapsedTime;            // Elapsed time in milliseconds
		std::vector<CRGBA> pixels;       // Pre-computed RGBA pixels, row-major order
		uint8_t imageWidth;              // Width in pixels
		uint8_t imageHeight;             // Height in pixels
		float centerX;                   // Center X position in canvas coords (snapped to LED)
		float centerY;                   // Center Y position in canvas coords (snapped to LED)
		float endX;                      // End X position in canvas coords (snapped to LED)
		float endY;                      // End Y position in canvas coords (snapped to LED)
		bool hasEndPosition;             // True if movement animation enabled
		EasingFunction easing;           // Easing function for movement
		uint32_t remaining() const { return duration - elapsedTime; }
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
