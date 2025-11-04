/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#ifndef RGFX_CONFIG_CONSTANTS_H
#define RGFX_CONFIG_CONSTANTS_H

/**
 * Centralized configuration constants for the RGFX Driver.
 * All global constants should be defined here for easy configuration and maintenance.
 */

// ============================================================================
// Network & Communication Configuration
// ============================================================================

/** UDP port for receiving LED effects from MAME */
constexpr int UDP_PORT = 8888;

/** UDP buffer size for incoming messages */
constexpr int UDP_BUFFER_SIZE = 256;

// ============================================================================
// Timing & Update Configuration
// ============================================================================

/**
 * WiFi Access Point mode timeout (milliseconds).
 * How long device stays in AP mode before falling back to saved WiFi credentials.
 * Also used for UI countdown display.
 */
constexpr unsigned long AP_TIMEOUT_MS = 10000; // 10 seconds

/**
 * OLED display uptime update interval (milliseconds).
 * How frequently the uptime display refreshes on the OLED screen.
 */
constexpr unsigned long UPTIME_UPDATE_INTERVAL = 5000; // 5 seconds

/**
 * MQTT message flash duration (milliseconds).
 * How long to display MQTT message indicator on OLED.
 */
constexpr unsigned long FLASH_DURATION_MS = 10; // 10 milliseconds

// ============================================================================
// Hardware Limits Configuration
// ============================================================================

/** Maximum number of GPIO pins that can drive LEDs simultaneously */
constexpr int MAX_PINS = 4;

/** Maximum number of LEDs per GPIO pin */
constexpr int MAX_LEDS_PER_PIN = 300;

// ============================================================================
// LED Configuration Defaults
// ============================================================================

/** Default matrix width (pixels) */
constexpr int DEFAULT_MATRIX_WIDTH = 8;

/** Default matrix height (pixels) */
constexpr int DEFAULT_MATRIX_HEIGHT = 8;

/**
 * Default LED update rate (frames per second).
 * Note: Actual value is stored in driver_config.h DriverConfigData.updateRate
 * This constant documents the default but isn't used at runtime.
 */
constexpr int DEFAULT_UPDATE_RATE = 120; // 120 FPS

#endif // RGFX_CONFIG_CONSTANTS_H
