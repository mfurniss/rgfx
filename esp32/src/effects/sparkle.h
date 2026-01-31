#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "gradient_utils.h"

/**
 * Sparkle Effect
 *
 * Creates twinkling single-LED particles that cycle through a color gradient.
 * Triggering creates a "cloud" that spawns particles over its duration.
 * Multiple clouds can be active simultaneously, sharing a FIFO particle buffer.
 */
class SparkleEffect : public IEffect {
   private:
	static constexpr uint8_t MAX_PARTICLES = 100;
	static constexpr uint8_t MAX_CLOUDS = 16;

	struct SparkleParticle {
		uint16_t x, y;       // Canvas position (LED * 4)
		uint16_t age;        // Current age (ms)
		uint16_t lifespan;   // Total lifespan (ms)
		uint8_t cloudIndex;  // Parent cloud for gradient/bloom lookup
		bool active;
	};

	struct SparkleCloud {
		uint32_t duration;  // Cloud duration (ms)
		uint32_t age;       // Current age (ms)
		uint8_t density;    // 1-100, spawn probability
		float speed;        // Gradient cycling speed
		uint8_t bloom;      // 0-100, light spread radius
		CRGB gradientLut[GRADIENT_LUT_SIZE];
		bool active;
	};

	// Shared FIFO particle buffer
	SparkleParticle particles[MAX_PARTICLES];
	uint8_t head = 0;   // Next write position
	uint8_t count = 0;  // Active particle count

	// Cloud storage
	SparkleCloud clouds[MAX_CLOUDS];

	const Matrix& matrix;
	Canvas& canvas;

	uint8_t findFreeCloud();
	void spawnParticle(uint8_t cloudIndex);
	void renderParticle(const SparkleParticle& p);

   public:
	SparkleEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
