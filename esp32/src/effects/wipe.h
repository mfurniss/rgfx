#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

enum class WipeDirection : uint8_t { LEFT, RIGHT, UP, DOWN };

class WipeEffect : public IEffect {
   private:
	struct Wipe {
		uint32_t duration;      // Total duration in milliseconds
		uint32_t elapsedTime;   // Elapsed time in milliseconds
		uint8_t r, g, b;        // RGB color
		WipeDirection direction;  // Resolved direction (never RANDOM at runtime)
		BlendMode blendMode;    // Blend mode for rendering

		// Calculate remaining duration
		uint32_t remaining() const { return duration - elapsedTime; }
	};

	std::vector<Wipe> wipes;  // Dynamic array of active wipes
	Canvas& canvas;

   public:
	WipeEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
