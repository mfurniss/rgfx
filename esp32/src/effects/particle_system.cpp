/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "particle_system.h"
#include <cmath>
#include <cstring>

ParticleSystem::ParticleSystem(const Matrix& matrix, Canvas& c)
    : canvas(c),
      canvasWidth(c.getWidth()),
      canvasHeight(c.getHeight()),
      isStrip(matrix.layoutType == LayoutType::STRIP),
      head(0) {
	memset(particlePool, 0, sizeof(particlePool));
}

void ParticleSystem::add(const Particle& p) {
	particlePool[head] = p;
	head = (head + 1) % MAX_PARTICLES;
}

void ParticleSystem::update(float deltaTime) {
	uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);

	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		Particle& p = particlePool[i];

		if (p.alpha == 0) {
			continue;
		}

		// Update X position - friction applied via exponential decay
		p.x += p.vx * deltaTime;
		p.vx *= expf(-p.friction * deltaTime);

		// Update Y position (only for matrices)
		if (!isStrip) {
			p.vy += p.gravity * deltaTime;
			p.y += p.vy * deltaTime;
			p.vy *= expf(-p.friction * deltaTime);
		}

		// Age the particle
		p.age += deltaTimeMs;

		// Check if particle is dead or out of bounds
		bool outOfBounds;
		if (isStrip) {
			outOfBounds = (p.x < 0 || p.x >= canvasWidth);
		} else {
			bool outX = (p.x < 0 || p.x >= canvasWidth);
			bool outTop = (p.y < 0) && (p.gravity >= 0);
			bool outBottom = (p.y >= canvasHeight) && (p.gravity <= 0);
			outOfBounds = outX || outTop || outBottom;
		}

		if (p.age >= p.lifespan || outOfBounds) {
			p.alpha = 0;
		} else {
			float lifeProgress = static_cast<float>(p.age) / p.lifespan;
			p.alpha = static_cast<uint8_t>(255.0f * (1.0f - lifeProgress));
		}
	}
}

void ParticleSystem::render() {
	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		const Particle& p = particlePool[i];

		if (p.alpha == 0) {
			continue;
		}

		uint8_t size = p.size;
		int16_t halfSize = size / 2;

		int16_t centerX = static_cast<int16_t>(p.x);
		int16_t centerY = static_cast<int16_t>(p.y);

		if (isStrip) {
			// Strip: Render full-height column for particle
			for (uint32_t dx = 0; dx < size; dx++) {
				int16_t x = centerX - halfSize + dx;

				if (x >= 0 && x < canvasWidth) {
					canvas.drawRectangle(x, static_cast<int16_t>(0), static_cast<int16_t>(1),
					                     static_cast<int16_t>(canvasHeight),
					                     CRGBA(p.r, p.g, p.b, p.alpha), BlendMode::ADDITIVE);
				}
			}
		} else {
			// Matrix: Render NxN block centered around position
			int16_t x = centerX - halfSize;
			int16_t y = centerY - halfSize;
			int16_t sizeS = static_cast<int16_t>(size);

			canvas.drawRectangle(x, y, sizeS, sizeS, CRGBA(p.r, p.g, p.b, p.alpha),
			                     BlendMode::ADDITIVE);
		}
	}
}

void ParticleSystem::reset() {
	for (uint32_t i = 0; i < MAX_PARTICLES; i++) {
		particlePool[i].alpha = 0;
	}
	head = 0;
}
