#pragma once

#include <FastLED.h>
#include <vector>
#include "effect.h"
#include "matrix.h"

class WipeEffect : public IEffect {
   private:
	struct Wipe {
		CRGB color;            // RGB color (3 bytes)
		uint8_t alpha;         // Alpha channel: 255 (full) → 0 (transparent)
		uint32_t duration;     // Total duration in milliseconds
		uint32_t elapsedTime;  // Elapsed time in milliseconds (only used for non-fading wipes)
		bool fade;             // Whether to fade out (true) or stay full brightness (false)

		// Calculate remaining duration
		uint32_t remaining() const {
			return fade ?
				((static_cast<uint32_t>(alpha) * duration) / 255) :
				(duration - elapsedTime);
		}
	};

	std::vector<Wipe> wipes;  // Dynamic array of active wipes

   public:
	WipeEffect();
	void addWipe(CRGB color, uint32_t duration, bool fade = true);
	void update(float deltaTime)
		override;  // Update all wipes, remove completed ones (deltaTime in seconds)
	void render(Matrix& matrix) override;  // Render all wipes to virtual display
	void reset() override;                 // Remove all active wipes
};
