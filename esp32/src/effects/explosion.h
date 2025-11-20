#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "canvas.h"

class ExplosionEffect : public IEffect {
   private:
	struct Particle {
		float x, y;           // Position (float for sub-pixel precision)
		float vx, vy;         // Velocity (constant direction)
		uint8_t r, g, b;      // RGB color
		uint8_t alpha;        // Alpha channel: 255 (full) → 0 (transparent)
		uint32_t lifespan;    // Total duration in milliseconds
		uint32_t age;         // Current age in milliseconds
	};

	struct Explosion {
		std::vector<Particle> particles;
		float centerX, centerY;
		uint32_t particleSize;
	};

	std::vector<Explosion> explosions;  // Dynamic array of active explosions
	Canvas canvas;

   public:
	ExplosionEffect(const Matrix& matrix);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	Canvas& getCanvas() override;
};
