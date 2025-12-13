#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

class ExplodeEffect : public IEffect {
   private:
	struct Particle {
		float x, y;              // Position (float for sub-pixel precision)
		float vx, vy;            // Velocity (constant direction)
		uint8_t r, g, b;         // RGB color
		uint8_t alpha;           // Alpha channel: 255 (full) → 0 (transparent)
		uint32_t lifespan;       // Total duration in milliseconds
		uint32_t age;            // Current age in milliseconds
		float friction;          // Velocity decay per second (denormalized from explosion)
		uint8_t particleSize;    // Render size in pixels (denormalized from explosion)
	};

	// Flash effect for LED strips only (white pulse that collapses inward)
	struct Flash {
		float centerX;            // Center position of flash
		float initialWidth;       // Starting width of flash
		float duration;           // Total flash duration in seconds
		float age;                // Current age in seconds
	};

	Canvas& canvas;
	const Matrix& matrix;
	std::vector<Particle> particlePool;     // Shared FIFO particle pool
	std::vector<Flash> flashes;             // Active flash effects (strips only)

   public:
	ExplodeEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
