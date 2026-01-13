#pragma once

#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "graphics/canvas.h"
#include "particle_system.h"

class ExplodeEffect : public IEffect {
   private:
	// Flash effect for LED strips only (colored pulse that collapses inward)
	struct Flash {
		float centerX;            // Center position of flash
		float initialWidth;       // Starting width of flash
		float duration;           // Total flash duration in seconds
		float age;                // Current age in seconds
		uint8_t r, g, b;          // RGB color (matches explosion color)
	};

	Canvas& canvas;
	const Matrix& matrix;
	ParticleSystem& particleSystem;
	std::vector<Flash> flashes;             // Active flash effects (strips only)

   public:
	ExplodeEffect(const Matrix& matrix, Canvas& canvas, ParticleSystem& particleSystem);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
