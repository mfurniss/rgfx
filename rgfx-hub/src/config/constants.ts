/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Centralized configuration constants for the RGFX Hub application.
 * All global constants should be defined here for easy configuration and maintenance.
 */

// ============================================================================
// Network & Communication Configuration
// ============================================================================

/** Default MQTT broker port */
export const MQTT_DEFAULT_PORT = 1883;

/** MQTT Quality of Service level (0: at most once, 1: at least once, 2: exactly once) */
export const MQTT_QOS_LEVEL = 2;

/** UDP port for sending LED effects to drivers */
export const UDP_PORT = 8888;

// ============================================================================
// Discovery & Heartbeat Configuration
// ============================================================================

/**
 * Interval between driver discovery pings (milliseconds).
 * The Hub broadcasts a discovery ping every 10 seconds to find active drivers.
 */
export const DISCOVERY_INTERVAL_MS = 10000; // 10 seconds

/**
 * Number of consecutive failed heartbeats before marking a driver as disconnected.
 * - 1 = aggressive (10s detection) - disconnects after first missed heartbeat
 * - 2 = balanced (20s detection) - allows 1 missed heartbeat [DEFAULT]
 * - 3+ = tolerant (30s+ detection) - allows 2+ missed heartbeats
 *
 * Disconnection time = HEARTBEAT_FAILURE_THRESHOLD × (DISCOVERY_INTERVAL_MS / 1000) seconds
 */
export const HEARTBEAT_FAILURE_THRESHOLD = 2;

// ============================================================================
// Application Window Configuration
// ============================================================================

/** Main application window width in pixels */
export const MAIN_WINDOW_WIDTH = 1000;

/** Main application window height in pixels */
export const MAIN_WINDOW_HEIGHT = 600;

// ============================================================================
// File System & Persistence Configuration
// ============================================================================

/** Version identifier for configuration file format */
export const CONFIG_VERSION = "1.0";

/** Base directory for configuration files (relative to app data directory) */
export const CONFIG_DIRECTORY = "config";

/**
 * Development flag to load mappers from source instead of user data directory.
 * Set to false in production to use installed mappers from user data.
 */
export const USE_SOURCE_MAPPERS = true;

/** Event file polling interval in milliseconds (backup to fs.watch) */
export const EVENT_FILE_POLL_INTERVAL = 500;

// ============================================================================
// mDNS Configuration
// ============================================================================

/** mDNS service name for MQTT broker discovery */
export const MDNS_SERVICE_NAME = "RGFX Hub";

/** mDNS service type */
export const MDNS_SERVICE_TYPE = "mqtt";

/** mDNS hostname for the Hub */
export const MDNS_HOSTNAME = "rgfx-hub.local";