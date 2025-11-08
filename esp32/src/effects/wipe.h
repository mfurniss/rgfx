#pragma once

#include <FastLED.h>
#include <vector>
#include <ArduinoJson.h>
#include "effect.h"
#include "matrix.h"

class WipeEffect : public IEffect {
   private:
	struct Wipe {
		CRGB color;            // RGB color (3 bytes)
		uint32_t duration;     // Total duration in milliseconds
		uint32_t elapsedTime;  // Elapsed time in milliseconds

		// Calculate current column position based on elapsed time
		uint16_t currentColumn(uint16_t matrixWidth) const {
			float progress = static_cast<float>(elapsedTime) / duration;
			return static_cast<uint16_t>(progress * matrixWidth);
		}

		// Calculate remaining duration
		uint32_t remaining() const { return duration - elapsedTime; }
	};

	std::vector<Wipe> wipes;  // Dynamic array of active wipes

   public:
	WipeEffect();
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render(Matrix& matrix) override;
	void reset() override;
};
