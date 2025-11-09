#pragma once

#include "matrix.h"
#include <ArduinoJson.h>

// Abstract base class defining the interface for all effects
class IEffect {
  public:
	virtual ~IEffect() = default;

	virtual void add(JsonDocument& props) = 0;
	virtual void update(float deltaTime) = 0;
	virtual void render() = 0;
	virtual void reset() = 0;
};
