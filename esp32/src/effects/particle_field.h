#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "direction.h"
#include "effect_utils.h"
#include "graphics/canvas.h"

static const uint8_t MAX_PARTICLE_FIELD_PARTICLES = 100;

/**
 * Particle Field Effect
 *
 * Creates a field of moving particles for starfields, rain, snow, etc.
 * Singleton effect - only one particle field active at a time.
 * Particles have randomized speed around a base value, with slower
 * particles appearing dimmer (lower alpha) to simulate distance.
 */
class ParticleFieldEffect : public IEffect {
   private:
	struct Particle {
		float x, y;      // Position on canvas (0-255 range)
		float speed;     // Actual speed (randomized around base)
		uint8_t alpha;   // Brightness (derived from speed ratio)
		uint8_t length;  // Length along movement axis (scaled by speed, min 6)
	};

	struct ParticleFieldState {
		Particle particles[MAX_PARTICLE_FIELD_PARTICLES];
		uint8_t particleCount;
		float baseSpeed;
		uint8_t size;
		Direction direction;
		uint8_t r, g, b;
		FadeState fade;  // Use shared FadeState from effect_utils.h
	};

	ParticleFieldState state;
	Canvas& canvas;

	void spawnParticle(Particle& p);
	void respawnAtEdge(Particle& p);
	Direction getEffectiveDirection() const;

   public:
	ParticleFieldEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
