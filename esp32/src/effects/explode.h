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
		float lifespanMultiplier; // Random multiplier (0.0-lifespanSpread) for fade variation
		uint32_t explosionId;    // Which explosion owns this particle
	};

	struct Explosion {
		uint32_t id;          // Unique ID for this explosion
		float centerX, centerY;
		uint32_t particleSize;
		float friction;

		// Flash state (LED strips only - white pulse that collapses inward)
		float flashInitialWidth;  // Starting width of flash
		float flashDuration;      // Total flash duration in seconds
		float flashAge;           // Current age in seconds
	};

	Canvas& canvas;
	const Matrix& matrix;
	std::vector<Particle> particlePool;     // Shared FIFO particle pool
	std::vector<Explosion> explosions;      // Dynamic array of active explosions
	uint32_t nextExplosionId;               // Counter for unique explosion IDs

   public:
	ExplodeEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
