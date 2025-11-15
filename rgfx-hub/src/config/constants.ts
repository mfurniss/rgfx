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

/** SSDP multicast port for service discovery */
export const SSDP_PORT = 1900;

/** SSDP service URN for MQTT broker discovery */
export const SSDP_SERVICE_URN = "urn:rgfx:service:mqtt:1";

/** Delay after MQTT broker initialization before sending discovery ping (milliseconds) */
export const MQTT_BROKER_INIT_DELAY_MS = 1000;

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

/** MQTT topic for system-wide discovery messages */
export const MQTT_TOPIC_DISCOVERY = "rgfx/system/discover";

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

// ============================================================================
// Event File Reader Configuration
// ============================================================================

/**
 * Filename for MAME event log file.
 * MAME Lua scripts write events to this file in ~/.rgfx/ directory.
 */
export const EVENT_LOG_FILENAME = "mame_events.log";

/**
 * Interval for health check polling of event file watcher (milliseconds).
 * The EventFileReader performs a health check every 5 seconds to ensure:
 * - File watcher is still active
 * - File exists when expected
 * - New events are detected even if fs.watch misses changes
 */
export const EVENT_FILE_HEALTH_CHECK_INTERVAL_MS = 5000;

/**
 * Maximum number of automatic watcher restarts before giving up.
 * If the file watcher fails repeatedly, it will attempt to restart up to this many times.
 */
export const EVENT_FILE_MAX_WATCHER_RESTARTS = 10;

/**
 * Maximum number of retry attempts for reading event file data.
 * If a read fails due to transient errors, it will retry up to this many times with exponential backoff.
 */
export const EVENT_FILE_MAX_READ_RETRIES = 3;

/**
 * Initial retry delay in milliseconds for event file read failures.
 * Subsequent retries use exponential backoff (delay × 2^retry_count).
 */
export const EVENT_FILE_RETRY_DELAY_MS = 100;

/**
 * Delay before restarting event file watcher after failure (milliseconds).
 * Gives the file system time to stabilize before attempting to watch again.
 */
export const EVENT_FILE_WATCHER_RESTART_DELAY_MS = 1000;

// ============================================================================
// Driver ID Validation Configuration
// ============================================================================

/**
 * Regular expression pattern for valid driver IDs.
 * - Must start and end with alphanumeric character (a-z, 0-9)
 * - Can contain hyphens in the middle
 * - All lowercase only
 * - Examples: "bedroom-leds", "cab-1", "player1", "rgfx-driver-0001"
 */
export const DRIVER_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Minimum length for driver IDs (inclusive).
 */
export const MIN_DRIVER_ID_LENGTH = 3;

/**
 * Maximum length for driver IDs (inclusive).
 * Ensures compatibility with MQTT topics and NVS storage.
 */
export const MAX_DRIVER_ID_LENGTH = 32;

/**
 * Reserved driver IDs that cannot be used by drivers.
 * These prevent collisions with system topics and reserved words.
 */
export const RESERVED_DRIVER_IDS = [
  "system",
  "discovery",
  "discover",
  "broadcast",
  "all",
  "config",
  "test",
  "status",
  "info",
  "debug",
  "error",
  "admin",
  "root",
] as const;

// ============================================================================
// UI Refresh Configuration
// ============================================================================

/**
 * Interval for updating UI timestamps in driver cards and tables (milliseconds).
 * Updates "X seconds ago" displays every second for live feedback.
 */
export const UI_TIMESTAMP_UPDATE_INTERVAL_MS = 1000;

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Retry delay for file watcher readiness checks in tests (milliseconds).
 * Tests poll with this delay to detect when fs.watch is initialized.
 */
export const TEST_FILE_WATCHER_RETRY_DELAY_MS = 50;

/**
 * Maximum retry attempts for file watcher readiness checks in tests.
 * Total wait time = TEST_FILE_WATCHER_RETRY_DELAY_MS × TEST_FILE_WATCHER_MAX_RETRIES
 * Default: 50ms × 40 = 2000ms (2 seconds)
 */
export const TEST_FILE_WATCHER_MAX_RETRIES = 40;