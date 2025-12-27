/**
 * LED Simulator Constants
 *
 * Window configuration, key codes, and color definitions.
 */
#pragma once

#include <cstdint>

// Window configuration
constexpr int MAX_WINDOW_WIDTH = 1200;
constexpr int MAX_WINDOW_HEIGHT = 800;
constexpr int MIN_WINDOW_WIDTH = 400;
constexpr int MIN_WINDOW_HEIGHT = 150;
constexpr int WINDOW_PADDING = 20;
constexpr int STATUS_BAR_HEIGHT = 30;
constexpr int MIN_LED_SIZE = 3;
constexpr int MAX_LED_SIZE = 8;
constexpr float LED_GAP = 4.0f;  // Fixed gap between LEDs in pixels

// Key codes
constexpr int KEY_SPACE = 32;
constexpr int KEY_C = 67;
constexpr int KEY_D = 68;
constexpr int KEY_Q = 81;
constexpr int KEY_S = 83;
constexpr int KEY_ONE = 49;
constexpr int KEY_TWO = 50;
constexpr int KEY_THREE = 51;
constexpr int KEY_FOUR = 52;
constexpr int KEY_FIVE = 53;
constexpr int KEY_SIX = 54;
constexpr int KEY_SEVEN = 55;
constexpr int KEY_EIGHT = 56;

// Colors (ABGR format for raylib)
constexpr uint32_t RAYLIB_BLACK = 0xFF000000;
constexpr uint32_t RAYLIB_DARKGRAY = 0xFF141414;
constexpr uint32_t RAYLIB_LIGHTGRAY = 0xFF808080;
constexpr uint32_t RAYLIB_WHITE = 0xFFFFFFFF;
