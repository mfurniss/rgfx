#pragma once

#include <cstdint>
#include <cstring>
#include "hal/platform.h"

/**
 * Unified direction enum for effects that support directional movement.
 * Used by wipe, projectile, and particle_field effects.
 */
enum class Direction : uint8_t { LEFT, RIGHT, UP, DOWN };

/**
 * Parse direction from string. Supports:
 * - "left", "right", "up", "down" - explicit direction
 * - "random" or "" - random direction
 *
 * @param dir Direction string (case-sensitive)
 * @param is1D If true, maps vertical directions to horizontal (for 1D LED strips)
 * @return Parsed Direction value
 */
inline Direction parseDirection(const char* dir, bool is1D = false) {
	Direction result;

	if (dir == nullptr || strcmp(dir, "random") == 0 || strcmp(dir, "") == 0) {
		result = static_cast<Direction>(hal::random(4));
	} else if (strcmp(dir, "left") == 0) {
		result = Direction::LEFT;
	} else if (strcmp(dir, "right") == 0) {
		result = Direction::RIGHT;
	} else if (strcmp(dir, "up") == 0) {
		result = Direction::UP;
	} else if (strcmp(dir, "down") == 0) {
		result = Direction::DOWN;
	} else {
		result = static_cast<Direction>(hal::random(4));
	}

	// For 1D strips, map vertical directions to horizontal
	if (is1D) {
		if (result == Direction::UP) result = Direction::LEFT;
		if (result == Direction::DOWN) result = Direction::RIGHT;
	}

	return result;
}
