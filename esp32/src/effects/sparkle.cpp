#include "sparkle.h"
#include "bloom_utils.h"
#include "effect_utils.h"
#include "generated/effect_defaults.h"
#include "hal/platform.h"
#include <cstring>
#include <algorithm>

SparkleEffect::SparkleEffect(const Matrix& m, Canvas& c)
	: particles{}, head(0), count(0), clouds{}, matrix(m), canvas(c) {}

uint8_t SparkleEffect::findFreeCloud() {
	// Find first inactive cloud
	for (uint8_t i = 0; i < MAX_CLOUDS; i++) {
		if (!clouds[i].active) {
			return i;
		}
	}
	// All full - find oldest (highest age)
	uint8_t oldest = 0;
	uint32_t maxAge = 0;
	for (uint8_t i = 0; i < MAX_CLOUDS; i++) {
		if (clouds[i].age > maxAge) {
			maxAge = clouds[i].age;
			oldest = i;
		}
	}
	return oldest;
}

void SparkleEffect::spawnParticle(uint8_t cloudIndex) {
	SparkleParticle& p = particles[head];

	// Random LED position, then convert to canvas coords (LED * 4)
	// For strips (height=1), canvas height is 1 pixel so y=0
	uint16_t ledX = hal::random(0, matrix.width);
	p.x = ledX * 4;
	p.y = (canvas.getHeight() == 1) ? 0 : hal::random(0, matrix.height) * 4;

	// Lifespan based on speed: 500ms / speed
	const SparkleCloud& cloud = clouds[cloudIndex];
	p.lifespan = static_cast<uint16_t>(500.0f / cloud.speed);
	if (p.lifespan < 50) p.lifespan = 50;  // Minimum 50ms

	p.age = 0;
	p.cloudIndex = cloudIndex;
	p.active = true;

	// Advance ring buffer
	head = (head + 1) % MAX_PARTICLES;
	if (count < MAX_PARTICLES) {
		count++;
	}
}

void SparkleEffect::renderParticle(const SparkleParticle& p) {
	if (!p.active) return;

	// Cloud data (gradientLut, bloom) remains valid after cloud.active = false
	const SparkleCloud& cloud = clouds[p.cloudIndex];

	// Calculate gradient progress (0-99) using integer math
	uint16_t clampedAge = (p.age > p.lifespan) ? p.lifespan : p.age;
	uint8_t lutIndex = static_cast<uint8_t>((static_cast<uint32_t>(clampedAge) * 99) / p.lifespan);

	CRGB color = cloud.gradientLut[lutIndex];

	// Overdrive center towards white, scaled by color luminosity
	// Dark colors stay dark, bright colors get overdriven to white
	CRGB centerColor = color;
	if (cloud.overdrive > 0) {
		uint8_t luma = max(color.r, max(color.g, color.b));
		uint8_t scaledOD = (static_cast<uint16_t>(cloud.overdrive) * luma) >> 8;
		centerColor.r = color.r + (((255 - color.r) * scaledOD) >> 8);
		centerColor.g = color.g + (((255 - color.g) * scaledOD) >> 8);
		centerColor.b = color.b + (((255 - color.b) * scaledOD) >> 8);
	}

	uint16_t cw = canvas.getWidth();
	uint16_t ch = canvas.getHeight();
	bool isStrip = (ch == 1);

	// Render center LED (overdriven when bloom enabled)
	if (isStrip) {
		// Strip: render 4x1 rectangle
		if (p.x + 4 <= cw) {
			canvas.drawRectangle(p.x, 0, 4, 1, CRGBA(centerColor, 255), BlendMode::ADDITIVE);
		}
	} else {
		// Matrix: render 4x4 block
		if (p.x + 4 <= cw && p.y + 4 <= ch) {
			canvas.fillBlock4x4Additive(p.x, p.y, centerColor, 255);
		}
	}

	// Bloom: spread to adjacent LEDs using shared bloom utility
	if (cloud.spreadRadius > 0) {
		BloomConfig config = {
			.radius = cloud.spreadRadius,
			.intensity = 127,
			.bloom = cloud.bloom
		};
		renderBloom(canvas, p.x, p.y, color, config, isStrip);
	}
}

void SparkleEffect::add(JsonDocument& props) {
	// Handle reset
	if (props["reset"].is<bool>() && props["reset"].as<bool>()) {
		reset();
	}

	// Find cloud slot
	uint8_t cloudIndex = findFreeCloud();
	SparkleCloud& cloud = clouds[cloudIndex];

	// Parse duration (0 = infinite)
	int dur = props["duration"] | static_cast<int>(effect_defaults::sparkle::duration);
	if (dur == 0) {
		cloud.duration = 0;  // Infinite
	} else {
		cloud.duration = static_cast<uint32_t>(max(100, dur));
	}

	// Parse density (1-100)
	cloud.density = props["density"] | static_cast<int>(effect_defaults::sparkle::density);
	if (cloud.density < 1) cloud.density = 1;
	if (cloud.density > 100) cloud.density = 100;

	// Parse speed (0.1-5.0)
	cloud.speed = props["speed"] | effect_defaults::sparkle::speed;
	if (cloud.speed < 0.1f) cloud.speed = 0.1f;
	if (cloud.speed > 5.0f) cloud.speed = 5.0f;

	// Parse bloom (0-100) and pre-compute spread radius
	cloud.bloom = props["bloom"] | static_cast<int>(effect_defaults::sparkle::bloom);
	if (cloud.bloom > 100) cloud.bloom = 100;
	cloud.spreadRadius = bloomPercentToRadius(cloud.bloom);
	cloud.overdrive = (cloud.bloom * 255) / 100;

	// Parse gradient
	if (!parseGradientFromJson(props, cloud.gradientLut)) {
		// Default gradient: white -> yellow -> red -> black
		CRGB defaultColors[4] = {
			CRGB(255, 255, 255),
			CRGB(255, 255, 0),
			CRGB(255, 0, 0),
			CRGB(0, 0, 0)};
		generateGradientLut(defaultColors, 4, cloud.gradientLut);
	}

	cloud.age = 0;
	cloud.active = true;
}

void SparkleEffect::update(float deltaTime) {
	uint32_t deltaMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	// Update clouds
	for (uint8_t i = 0; i < MAX_CLOUDS; i++) {
		SparkleCloud& cloud = clouds[i];
		if (!cloud.active) continue;

		cloud.age += deltaMs;

		// Deactivate expired clouds (duration 0 = infinite)
		if (cloud.duration > 0 && cloud.age >= cloud.duration) {
			cloud.active = false;
			continue;
		}

		// Frame-rate independent spawn check (integer math)
		// Threshold scaled to 1000 (1000 = 100% spawn probability)
		// At 60fps (deltaMs≈17), density=100: threshold = 100*17*6/10 = 1020 (always spawn)
		uint32_t threshold = (static_cast<uint32_t>(cloud.density) * deltaMs * 6) / 10;
		if (hal::random(0, 1000) < threshold) {
			spawnParticle(i);
		}
	}

	// Update particles
	for (uint8_t i = 0; i < MAX_PARTICLES; i++) {
		SparkleParticle& p = particles[i];
		if (!p.active) continue;

		p.age += deltaMs;

		// Deactivate expired particles
		if (p.age >= p.lifespan) {
			p.active = false;
			if (count > 0) count--;
		}
	}
}

void SparkleEffect::render() {
	// Early exit if no active particles
	if (count == 0) return;

	for (uint8_t i = 0; i < MAX_PARTICLES; i++) {
		if (particles[i].active) {
			renderParticle(particles[i]);
		}
	}
}

void SparkleEffect::reset() {
	// Clear all particles
	for (uint8_t i = 0; i < MAX_PARTICLES; i++) {
		particles[i].active = false;
	}
	head = 0;
	count = 0;

	// Clear all clouds
	for (uint8_t i = 0; i < MAX_CLOUDS; i++) {
		clouds[i].active = false;
	}
}
