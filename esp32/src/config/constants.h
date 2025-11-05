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

/** Serial command buffer size for user input */
constexpr int SERIAL_BUFFER_SIZE = 128;

/** Web server port for configuration portal */
constexpr uint16_t WEB_SERVER_PORT = 80;

/** Access Point IP address for configuration portal */
constexpr const char* AP_IP_ADDRESS = "192.168.4.1";

/**
 * IotWebConf configuration version string.
 * Increment this when changing IotWebConf parameter structure to force reconfiguration.
 */
#define CONFIG_VERSION "rgfx3"

/** MQTT broker port */
constexpr int MQTT_PORT = 1883;

/** MQTT username (empty if no authentication) */
constexpr const char* MQTT_USER = "";

/** MQTT password (empty if no authentication) */
constexpr const char* MQTT_PASSWORD = "";

/** MQTT buffer size for large JSON payloads */
constexpr uint16_t MQTT_BUFFER_SIZE = 1024;

/** MQTT reconnection retry interval (milliseconds) */
constexpr uint16_t MQTT_RECONNECT_INTERVAL_MS = 5000;

/** Max consecutive MQTT failures before rediscovery (3 failures = 15 seconds) */
constexpr int MAX_FAILURES_BEFORE_REDISCOVERY = 3;

/** MQTT topic for test commands */
constexpr const char* MQTT_TOPIC_TEST = "rgfx/test";

/** MQTT topic for status messages */
constexpr const char* MQTT_TOPIC_STATUS = "led/status";

// ============================================================================
// Timing & Update Configuration
// ============================================================================

/**
 * WiFi connection timeout (milliseconds).
 * How long to attempt connecting to saved WiFi credentials before falling back to AP mode.
 * Must be long enough for WiFi to complete connection handshake (typically 3-10 seconds).
 */
constexpr unsigned long WIFI_CONNECTION_TIMEOUT_MS = 10000;

/**
 * WiFi Access Point mode timeout (milliseconds).
 * How long device stays in AP mode (for configuration) before retrying saved WiFi credentials.
 * Also used for UI countdown display.
 */
constexpr unsigned long AP_TIMEOUT_MS = 3000;

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
