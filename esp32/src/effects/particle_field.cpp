#include "particle_field.h"
#include "effect_utils.h"
#include "hal/platform.h"
#include <cstring>

ParticleFieldEffect::ParticleFieldEffect(const Matrix& m, Canvas& c)
	: state{{}, 0, 0.0f, 4, Direction::DOWN, 255, 255, 255, EnabledState::OFF, 0.0f, 0}, canvas(c) {
	(void)m;  // Matrix not needed, but kept for API consistency
}

ParticleFieldEffect::Direction ParticleFieldEffect::parseDirection(const char* str) {
	if (strcmp(str, "up") == 0) return Direction::UP;
	if (strcmp(str, "down") == 0) return Direction::DOWN;
	if (strcmp(str, "left") == 0) return Direction::LEFT;
	if (strcmp(str, "right") == 0) return Direction::RIGHT;
	return Direction::DOWN;
}

ParticleFieldEffect::EnabledState ParticleFieldEffect::parseEnabledState(const char* str) {
	if (strcmp(str, "off") == 0) return EnabledState::OFF;
	if (strcmp(str, "on") == 0) return EnabledState::ON;
	if (strcmp(str, "fadeIn") == 0) return EnabledState::FADE_IN;
	if (strcmp(str, "fadeOut") == 0) return EnabledState::FADE_OUT;
	return EnabledState::ON;
}

void ParticleFieldEffect::updateAlpha() {
	switch (state.enabledState) {
		case EnabledState::OFF:
			state.currentAlpha = 0;
			break;
		case EnabledState::ON:
			state.currentAlpha = 255;
			break;
		case EnabledState::FADE_IN: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>(progress * 255.0f);
			break;
		}
		case EnabledState::FADE_OUT: {
			float progress = state.fadeTime / FADE_DURATION;
			if (progress > 1.0f) progress = 1.0f;
			state.currentAlpha = static_cast<uint8_t>((1.0f - progress) * 255.0f);
			break;
		}
	}
}

ParticleFieldEffect::Direction ParticleFieldEffect::getEffectiveDirection() const {
	Direction dir = state.direction;
	// For strips (height=1), map up/down to left/right
	if (canvas.getHeight() == 1) {
		if (dir == Direction::UP) dir = Direction::RIGHT;
		if (dir == Direction::DOWN) dir = Direction::LEFT;
	}
	return dir;
}

void ParticleFieldEffect::spawnParticle(Particle& p) {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	Direction dir = getEffectiveDirection();

	// Speed variation: 0.25x to 1.0x of max speed (param is max)
	float speedFactor = 0.25f + (hal::random(0, 75) / 100.0f);  // 0.25 to 1.0
	p.speed = state.baseSpeed * speedFactor;

	// Alpha proportional to speed - slower = dimmer (simulates distance)
	// Normalize speedFactor (0.25-1.0) to 0-1 range, then map to alpha 80-255
	float normalizedSpeed = (speedFactor - 0.25f) / 0.75f;  // 0.0 to 1.0
	p.alpha = static_cast<uint8_t>(80 + (normalizedSpeed * 175.0f));

	// Length proportional to speed - slower = shorter (min 6, max state.size)
	constexpr uint8_t MIN_LENGTH = 6;
	uint8_t lengthRange = (state.size > MIN_LENGTH) ? (state.size - MIN_LENGTH) : 0;
	p.length = MIN_LENGTH + static_cast<uint8_t>(normalizedSpeed * lengthRange);

	// Snap perpendicular axis to LED grid
	// Perpendicular dimension is always 4 canvas pixels
	// Up/down movement: snap X to multiples of 4
	// Left/right movement: snap Y to multiples of 4
	constexpr uint8_t PERPENDICULAR_SIZE = 4;
	uint16_t gridSlots;

	switch (dir) {
		case Direction::DOWN:
		case Direction::UP:
			// Snap X to grid (width is 4), randomize Y
			gridSlots = width / PERPENDICULAR_SIZE;
			p.x = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.y = static_cast<float>(hal::random(0, height));
			break;
		case Direction::LEFT:
		case Direction::RIGHT:
			// Snap Y to grid (height is 4), randomize X
			gridSlots = height / PERPENDICULAR_SIZE;
			p.y = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.x = static_cast<float>(hal::random(0, width));
			break;
	}
}

void ParticleFieldEffect::respawnAtEdge(Particle& p) {
	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	Direction dir = getEffectiveDirection();

	// Recalculate speed and alpha for variety
	// Speed variation: 0.25x to 1.0x of max speed (param is max)
	float speedFactor = 0.25f + (hal::random(0, 75) / 100.0f);  // 0.25 to 1.0
	p.speed = state.baseSpeed * speedFactor;
	// Normalize speedFactor (0.25-1.0) to 0-1 range, then map to alpha 80-255
	float normalizedSpeed = (speedFactor - 0.25f) / 0.75f;  // 0.0 to 1.0
	p.alpha = static_cast<uint8_t>(80 + (normalizedSpeed * 175.0f));

	// Length proportional to speed - slower = shorter (min 6, max state.size)
	constexpr uint8_t MIN_LENGTH = 6;
	uint8_t lengthRange = (state.size > MIN_LENGTH) ? (state.size - MIN_LENGTH) : 0;
	p.length = MIN_LENGTH + static_cast<uint8_t>(normalizedSpeed * lengthRange);

	// Respawn at opposite edge with perpendicular axis snapped to LED grid
	// Perpendicular dimension is always 4 canvas pixels
	constexpr uint8_t PERPENDICULAR_SIZE = 4;
	uint16_t gridSlots;

	// Spawn off-screen based on particle length so they don't "pop in"
	switch (dir) {
		case Direction::DOWN:
			// Snap X to grid (width is 4), start above top edge
			gridSlots = width / PERPENDICULAR_SIZE;
			p.x = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.y = -static_cast<float>(p.length);
			break;
		case Direction::UP:
			// Snap X to grid (width is 4), start below bottom edge
			gridSlots = width / PERPENDICULAR_SIZE;
			p.x = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.y = static_cast<float>(height);
			break;
		case Direction::LEFT:
			// Snap Y to grid (height is 4), start past right edge
			gridSlots = height / PERPENDICULAR_SIZE;
			p.y = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.x = static_cast<float>(width);
			break;
		case Direction::RIGHT:
			// Snap Y to grid (height is 4), start past left edge
			gridSlots = height / PERPENDICULAR_SIZE;
			p.y = static_cast<float>(hal::random(0, gridSlots) * PERPENDICULAR_SIZE);
			p.x = -static_cast<float>(p.length);
			break;
	}
}

void ParticleFieldEffect::add(JsonDocument& props) {
	// Parse enabled state
	EnabledState enabledState = EnabledState::ON;
	if (!props["enabled"].isNull()) {
		if (props["enabled"].is<bool>()) {
			enabledState = props["enabled"].as<bool>() ? EnabledState::ON : EnabledState::OFF;
		} else if (props["enabled"].is<const char*>()) {
			enabledState = parseEnabledState(props["enabled"].as<const char*>());
		}
	}

	// Handle instant off
	if (enabledState == EnabledState::OFF) {
		state.enabledState = EnabledState::OFF;
		state.currentAlpha = 0;
		return;
	}

	// Handle fadeOut - preserve particles, just fade
	if (enabledState == EnabledState::FADE_OUT) {
		state.fadeTime = ((255 - state.currentAlpha) / 255.0f) * FADE_DURATION;
		state.enabledState = EnabledState::FADE_OUT;
		return;
	}

	// Parse direction
	Direction direction = Direction::DOWN;
	if (props["direction"].is<const char*>()) {
		direction = parseDirection(props["direction"].as<const char*>());
	}

	// Parse density (1-100)
	uint8_t density = 20;
	if (props["density"].is<int>()) {
		density = props["density"].as<int>();
		if (density < 1) density = 1;
		if (density > MAX_PARTICLES) density = MAX_PARTICLES;
	}

	// Parse speed (10-1000 pixels/second)
	float speed = 50.0f;
	if (props["speed"].is<float>() || props["speed"].is<int>()) {
		speed = props["speed"].as<float>();
		if (speed < 10.0f) speed = 10.0f;
		if (speed > 1000.0f) speed = 1000.0f;
	}

	// Parse size (1-16)
	uint8_t size = 4;
	if (props["size"].is<int>()) {
		size = props["size"].as<int>();
		if (size < 1) size = 1;
		if (size > 16) size = 16;
	}

	// Parse color - hub must provide this
	if (!props["color"].is<const char*>()) {
		hal::log("ERROR: particle_field missing required 'color' prop");
		return;
	}
	const char* colorStr = props["color"].as<const char*>();
	uint8_t r, g, b;
	if (strcmp(colorStr, "random") == 0) {
		uint32_t c = randomColor();
		r = (c >> 16) & 0xFF;
		g = (c >> 8) & 0xFF;
		b = c & 0xFF;
	} else {
		uint32_t c = parseColor(colorStr);
		r = (c >> 16) & 0xFF;
		g = (c >> 8) & 0xFF;
		b = c & 0xFF;
	}

	// Store state
	state.direction = direction;
	state.baseSpeed = speed;
	state.size = size;
	state.r = r;
	state.g = g;
	state.b = b;

	// Spawn or adjust particles based on density change
	if (density != state.particleCount) {
		state.particleCount = density;
		for (uint8_t i = 0; i < state.particleCount; i++) {
			spawnParticle(state.particles[i]);
		}
	}

	// Handle fade transitions
	if (enabledState == EnabledState::FADE_IN) {
		state.fadeTime = (state.currentAlpha / 255.0f) * FADE_DURATION;
	} else {
		state.fadeTime = 0.0f;
		state.currentAlpha = 255;
	}

	state.enabledState = enabledState;
}

void ParticleFieldEffect::update(float deltaTime) {
	if (state.enabledState == EnabledState::OFF) {
		return;
	}

	uint16_t width = canvas.getWidth();
	uint16_t height = canvas.getHeight();
	Direction dir = getEffectiveDirection();

	// Update particle positions
	// Respawn when particle fully exits the canvas (including its length)
	for (uint8_t i = 0; i < state.particleCount; i++) {
		Particle& p = state.particles[i];
		float movement = p.speed * deltaTime;

		switch (dir) {
			case Direction::DOWN:
				p.y += movement;
				if (p.y >= height) respawnAtEdge(p);
				break;
			case Direction::UP:
				p.y -= movement;
				if (p.y + p.length < 0) respawnAtEdge(p);
				break;
			case Direction::LEFT:
				p.x -= movement;
				if (p.x + p.length < 0) respawnAtEdge(p);
				break;
			case Direction::RIGHT:
				p.x += movement;
				if (p.x >= width) respawnAtEdge(p);
				break;
		}
	}

	// Handle fade transitions
	if (state.enabledState == EnabledState::FADE_IN || state.enabledState == EnabledState::FADE_OUT) {
		state.fadeTime += deltaTime;

		if (state.fadeTime >= FADE_DURATION) {
			state.enabledState =
				(state.enabledState == EnabledState::FADE_IN) ? EnabledState::ON : EnabledState::OFF;
			state.fadeTime = 0.0f;
		}

		updateAlpha();
	}
}

void ParticleFieldEffect::render() {
	if (state.enabledState == EnabledState::OFF || state.currentAlpha == 0) {
		return;
	}

	uint8_t globalAlpha = state.currentAlpha;
	Direction dir = getEffectiveDirection();
	bool isHorizontal = (dir == Direction::LEFT || dir == Direction::RIGHT);

	for (uint8_t i = 0; i < state.particleCount; i++) {
		const Particle& p = state.particles[i];

		// Particle dimensions: 4 pixels perpendicular to movement, p.length along movement
		uint8_t width, height;
		if (isHorizontal) {
			width = p.length;
			height = 4;
		} else {
			width = 4;
			height = p.length;
		}

		// Combine particle alpha with global fade alpha
		uint8_t alpha = (static_cast<uint16_t>(p.alpha) * globalAlpha) / 255;

		// Scale color by alpha for additive-like appearance
		uint8_t r = (state.r * alpha) / 255;
		uint8_t g = (state.g * alpha) / 255;
		uint8_t b = (state.b * alpha) / 255;

		int16_t x = static_cast<int16_t>(p.x);
		int16_t y = static_cast<int16_t>(p.y);

		canvas.drawRectangle(x, y, width, height, CRGB(r, g, b));
	}
}

void ParticleFieldEffect::reset() {
	state.enabledState = EnabledState::OFF;
	state.particleCount = 0;
	state.baseSpeed = 0.0f;
	state.size = 4;
	state.direction = Direction::DOWN;
	state.r = 255;
	state.g = 255;
	state.b = 255;
	state.fadeTime = 0.0f;
	state.currentAlpha = 0;
}
