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
export const SSDP_SERVICE_URN = 'urn:rgfx:service:mqtt:1';

/** UDP port for broker discovery broadcasts (ESP32 listens on this port) */
export const UDP_DISCOVERY_PORT = 8889;

/** Interval for UDP broker discovery broadcasts (milliseconds) */
export const UDP_DISCOVERY_INTERVAL_MS = 5000;

// ============================================================================
// Driver Connection Timeout Configuration
// ============================================================================

/**
 * Connection timeout for drivers (milliseconds).
 * Drivers are considered connected if telemetry received within this window.
 * Default: 30000ms (30 seconds) = 3× the 10s telemetry interval for tolerance.
 */
export const DRIVER_CONNECTION_TIMEOUT_MS = 30000;

/**
 * Interval for checking driver connection timeouts (milliseconds).
 * The driver store checks for stale connections at this interval.
 */
export const DRIVER_CONNECTION_CHECK_INTERVAL_MS = 5000;

// ============================================================================
// Application Window Configuration
// ============================================================================

/** Main application window width in pixels */
export const MAIN_WINDOW_WIDTH = 1000;

/** Main application window height in pixels */
export const MAIN_WINDOW_HEIGHT = 800;

/** Main application window zoom factor (1.0 = 100%, 0.9 = 90%, etc.) */
export const MAIN_WINDOW_ZOOM_FACTOR = 0.9;

/** Whether to automatically open DevTools console in development mode */
export const OPEN_DEVTOOLS_IN_DEV = false;

// ============================================================================
// File System & Persistence Configuration
// ============================================================================

/** Version identifier for configuration file format */
export const CONFIG_VERSION = '1.0';

// ============================================================================
// Event File Reader Configuration
// ============================================================================

/**
 * Filename for MAME event log file.
 * MAME Lua scripts write events to this file in ~/.rgfx/ directory.
 */
export const EVENT_LOG_FILENAME = 'mame_events.log';

/**
 * Interval for polling event file existence when file doesn't exist (milliseconds).
 * When the event file is not present, EventFileReader checks for it every 5 seconds.
 */
export const EVENT_FILE_POLL_INTERVAL_MS = 5000;

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


// ============================================================================
// UI Refresh Configuration
// ============================================================================

/**
 * Interval for updating UI timestamps in driver cards and tables (milliseconds).
 * Updates "X seconds ago" displays every second for live feedback.
 */
export const UI_TIMESTAMP_UPDATE_INTERVAL_MS = 1000;

/**
 * Duration for toast notifications to auto-hide (milliseconds).
 * Long enough to read, short enough not to annoy.
 */
export const TOAST_AUTO_HIDE_DURATION_MS = 5000;

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
