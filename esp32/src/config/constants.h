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

/** UDP port for receiving LED effects from Hub */
constexpr int UDP_PORT = 8888;

/**
 * UDP buffer size for incoming messages.
 * Sized to accommodate typical effect payloads with room to spare.
 */
constexpr int UDP_BUFFER_SIZE = 1472;  // Max UDP payload without IP fragmentation

/** Serial command buffer size for user input (longest command ~50 chars) */
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

/**
 * Broker discovery poll interval (milliseconds).
 * Hub broadcasts its presence every 5 seconds, so poll slightly faster to ensure discovery.
 */
constexpr uint16_t SSDP_POLL_INTERVAL_MS = 3000;

/**
 * MQTT reconnection retry interval (milliseconds).
 * Allows time for network to stabilize between attempts without spamming.
 */
constexpr uint16_t MQTT_RECONNECT_INTERVAL_MS = 5000;

/**
 * MQTT keep-alive interval (seconds).
 * Broker disconnects client if no activity within 1.5x this value.
 * Set to 60 seconds to provide resilience against brief network hiccups
 * and blocking operations like broker discovery (which can take 6 seconds).
 * Telemetry sent every 10 seconds provides more frequent implicit heartbeats.
 */
constexpr int MQTT_KEEPALIVE_SECONDS = 60;

/** MQTT topic for test commands */
constexpr const char* MQTT_TOPIC_TEST = "rgfx/test";

/** MQTT topic for status messages */
constexpr const char* MQTT_TOPIC_STATUS = "led/status";

/**
 * MQTT telemetry broadcast interval (milliseconds).
 * Periodic heartbeat sent to Hub with driver status (heap, uptime, etc.).
 * 10 seconds balances responsiveness vs network/CPU overhead.
 */
constexpr unsigned long TELEMETRY_INTERVAL_MS = 10000;

/**
 * Delay after publishing MQTT message before reboot (milliseconds).
 * Ensures message is transmitted before device restarts.
 */
constexpr unsigned long MQTT_PUBLISH_BEFORE_REBOOT_DELAY_MS = 1000;

/**
 * Delay before restart to allow Core 1 to stop LED operations (milliseconds).
 * Must be long enough for Core 1's main loop to check g_configUpdateInProgress flag
 * and for any in-progress FastLED.show() to complete.
 * WS2812B takes ~30µs per LED, so 1000 LEDs = 30ms. 1 second provides safe margin.
 */
constexpr unsigned long SAFE_RESTART_CORE1_STOP_DELAY_MS = 1000;

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
constexpr unsigned long UPTIME_UPDATE_INTERVAL = 5000;  // 5 seconds

/**
 * MQTT message flash duration (milliseconds).
 * How long to display MQTT message indicator on OLED.
 */
constexpr unsigned long FLASH_DURATION_MS = 10;  // 10 milliseconds

/** Onboard LED GPIO pin for status indication */
constexpr int ONBOARD_LED_PIN = 2;

/** Onboard LED flash duration for network events (milliseconds) */
constexpr unsigned long INDICATOR_FLASH_MS = 20;

// ============================================================================
// Hardware Limits Configuration
// ============================================================================

/**
 * Maximum number of GPIO pins that can drive LEDs simultaneously.
 * Limited by FastLED parallel output and available RMT channels on ESP32.
 * Each pin can drive a separate LED strip/matrix.
 */
constexpr int MAX_PINS = 4;

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
constexpr int DEFAULT_UPDATE_RATE = 120;  // 120 FPS

#endif  // RGFX_CONFIG_CONSTANTS_H
