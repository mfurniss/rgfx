#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
#include "direction.h"
#include "instance_vector.h"
#include "graphics/canvas.h"
#include "particle_system.h"

class ProjectileEffect : public IEffect {
   private:
	static constexpr size_t MAX_PROJECTILES = 64;

	struct Projectile {
		float x, y;           // Position (canvas coordinates, sub-pixel)
		float velocityX;      // Horizontal velocity (pixels/second)
		float velocityY;      // Vertical velocity (pixels/second)
		float friction;       // Friction (0=none, positive=decel, negative=accel)
		float trail;          // Trail multiplier (tail = position - velocity * trail)
		uint8_t width;        // Projectile width in canvas pixels
		uint8_t height;       // Projectile height in canvas pixels
		RGBColor color;       // RGB color
		float elapsedTime;    // Time since creation (seconds)
		float maxLifespan;    // Auto-removal timeout (seconds)
		float particleDensity;      // % chance per frame to emit particle (0-100)
	};

	CappedVector<Projectile, MAX_PROJECTILES> projectiles;
	Canvas& canvas;
	ParticleSystem& particleSystem;
	uint16_t canvasWidth;
	uint16_t canvasHeight;

   public:
	ProjectileEffect(const Matrix& matrix, Canvas& canvas, ParticleSystem& particleSystem);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
