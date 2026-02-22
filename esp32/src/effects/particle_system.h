#pragma once

#include <cstdint>
#include "graphics/canvas.h"
#include "graphics/matrix.h"

struct Particle {
	float x, y;           // Position (sub-pixel precision)
	float vx, vy;         // Velocity (pixels/second)
	uint8_t r, g, b;      // RGB color
	uint8_t alpha;        // 0 = dead, 255 = fully visible
	uint32_t lifespan;    // Total lifespan (milliseconds)
	uint32_t age;         // Current age (milliseconds)
	float friction;       // Velocity decay rate
	float gravity;        // Vertical acceleration (pixels/sec^2)
	uint8_t size;         // Render size (pixels)
};

class ParticleSystem {
   private:
	static constexpr uint32_t MAX_PARTICLES = 500;
	Particle particlePool[MAX_PARTICLES];
	Canvas& canvas;
	uint16_t canvasWidth;
	uint16_t canvasHeight;
	bool isStrip;
	uint32_t head = 0;
	uint32_t activeCount = 0;  // Tracks live particles for early-exit optimization

   public:
	ParticleSystem(const Matrix& matrix, Canvas& canvas);

	void add(const Particle& p);
	void update(float deltaTime);
	void render();
	void reset();

	uint32_t getActiveCount() const { return activeCount; }
};
