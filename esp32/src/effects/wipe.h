#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "effect_utils.h"
#include "direction.h"
#include "instance_vector.h"
#include "graphics/canvas.h"

class WipeEffect : public IEffect {
   private:
	static constexpr size_t MAX_WIPES = 64;

	struct Wipe {
		uint32_t duration;      // Total duration in milliseconds
		uint32_t elapsedTime;   // Elapsed time in milliseconds
		RGBColor color;         // RGB color
		Direction direction;    // Resolved direction (never RANDOM at runtime)
		BlendMode blendMode;    // Blend mode for rendering

		// Calculate remaining duration
		uint32_t remaining() const { return duration - elapsedTime; }
	};

	CappedVector<Wipe, MAX_WIPES> wipes;
	Canvas& canvas;

   public:
	WipeEffect(Canvas& canvas);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
};
