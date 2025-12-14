#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"

enum class ProjectileDirection : uint8_t { LEFT, RIGHT, UP, DOWN };

class ProjectileEffect : public IEffect {
   private:
	struct Projectile {
		float x, y;           // Position (canvas coordinates, sub-pixel)
		float velocityX;      // Horizontal velocity (pixels/second)
		float velocityY;      // Vertical velocity (pixels/second)
		float friction;       // Friction (0=none, positive=decel, negative=accel)
		float trail;          // Trail multiplier (tail = position - velocity * trail)
		uint8_t width;        // Projectile width in canvas pixels
		uint8_t height;       // Projectile height in canvas pixels
		uint8_t r, g, b;      // RGB color
		float elapsedTime;    // Time since creation (seconds)
		float maxLifespan;    // Auto-removal timeout (seconds)
	};

	std::vector<Projectile> projectiles;
	Canvas& canvas;
	uint16_t canvasWidth;
	uint16_t canvasHeight;

   public:
	ProjectileEffect(const Matrix& matrix, Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
