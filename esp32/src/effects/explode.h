#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
#include "instance_vector.h"
#include "graphics/canvas.h"
#include "particle_system.h"

class ExplodeEffect : public IEffect {
   private:
	static constexpr size_t MAX_FLASHES = 64;

	// Flash effect for LED strips only (colored pulse that collapses inward)
	struct Flash {
		float centerX;            // Center position of flash
		float initialWidth;       // Starting width of flash
		float duration;           // Total flash duration in seconds
		float age;                // Current age in seconds
		RGBColor color;           // RGB color (matches explosion color)
	};

	Canvas& canvas;
	const Matrix& matrix;
	ParticleSystem& particleSystem;
	CappedVector<Flash, MAX_FLASHES> flashes;

   public:
	ExplodeEffect(const Matrix& matrix, Canvas& canvas, ParticleSystem& particleSystem);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
