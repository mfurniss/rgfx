#pragma once

#include <ArduinoJson.h>
#include "effect.h"
#include "canvas.h"

class TestLedsEffect : public IEffect {
   private:
	Canvas canvas;
	const Matrix& matrix;

   public:
	TestLedsEffect(const Matrix& matrix);
	void add(JsonDocument& props) override;
	void update(float deltaTime) override;
	void render() override;
	void reset() override;
	Canvas& getCanvas() override;
};