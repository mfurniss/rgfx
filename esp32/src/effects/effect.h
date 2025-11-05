#pragma once

#include "matrix.h"

// Abstract base class defining the interface for all effects
class IEffect {
  public:
	virtual ~IEffect() = default; // Virtual destructor for proper cleanup

	// Update effect state based on elapsed time (deltaTime in seconds)
	virtual void update(float deltaTime) = 0;

	// Render the effect to the LED matrix
	virtual void render(Matrix& matrix) = 0;

	// Reset the effect to its initial state
	virtual void reset() = 0;
};
