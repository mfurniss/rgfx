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
export const UDP_PORT = 8811;

/**
 * Maximum UDP packet size for driver communication (bytes).
 * Must match ESP32 UDP_BUFFER_SIZE in esp32/src/config/constants.h.
 * Packets exceeding this size will be truncated by the driver.
 */
export const UDP_BUFFER_SIZE = 1472; // Max UDP payload without IP fragmentation

/** SSDP multicast port for service discovery */
export const SSDP_PORT = 1900;

/** SSDP service URN for MQTT broker discovery */
export const SSDP_SERVICE_URN = 'urn:rgfx:service:mqtt:1';

/** UDP port for broker discovery broadcasts (ESP32 listens on this port) */
export const UDP_DISCOVERY_PORT = 8889;

/** Interval for UDP broker discovery broadcasts (milliseconds) */
export const UDP_DISCOVERY_INTERVAL_MS = 5000;

/** Debounce delay before restarting discovery after network change (milliseconds) */
export const DISCOVERY_RESTART_DEBOUNCE_MS = 5000;

/** Interval for checking if the local IP address has changed (milliseconds) */
export const IP_CHECK_INTERVAL_MS = 5000;

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

/** Whether to log all events emitted on the event bus */
export const EVENT_BUS_LOGGING = true;

// ============================================================================
// File System & Persistence Configuration
// ============================================================================

/** Version identifier for configuration file format */
export const CONFIG_VERSION = '1.0';

/**
 * Polling interval for firmware file watcher (milliseconds).
 * Used when native fs.watch is not available or fails.
 */
export const FIRMWARE_WATCHER_POLL_INTERVAL_MS = 5000;

/**
 * Supported ROM file extensions for game detection.
 * Used to identify ROM files in the MAME ROMs directory.
 */
export const ROM_EXTENSIONS = ['.zip', '.nes', '.smc', '.sfc', '.bin', '.rom'];

// ============================================================================
// Event File Reader Configuration
// ============================================================================

/**
 * Filename for interceptor event log file.
 * Interceptor Lua scripts write events to this file in ~/.rgfx/ directory.
 */
export const EVENT_LOG_FILENAME = 'interceptor-events.log';

/**
 * Interval for polling event file existence when file doesn't exist (milliseconds).
 * When the event file is not present, EventFileReader checks for it every 5 seconds.
 */
export const EVENT_FILE_POLL_INTERVAL_MS = 5000;

/**
 * Maximum event log file size before trimming (bytes).
 * When exceeded, the file is trimmed to EVENT_LOG_TRIM_TARGET_BYTES.
 */
export const EVENT_LOG_MAX_SIZE_BYTES = 1024 * 1024; // 1MB

/**
 * Target size after trimming event log file (bytes).
 * Keeps the most recent logs for debugging purposes.
 */
export const EVENT_LOG_TRIM_TARGET_BYTES = 512 * 1024; // 500KB

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
// Effects Configuration
// ============================================================================

/**
 * Maximum number of colors allowed in a gradient effect.
 */
export const MAX_GRADIENT_COLORS = 64;

/**
 * Regular expression for validating RRGGBB hex color strings with # prefix.
 * Matches: #FF0000, #00ff00, #1A2B3C
 * Does not match: FF0000 (no #), #FFF (shorthand), #GGGGGG (invalid chars)
 */
export const HEX_COLOR_RRGGBB_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Default effect selected in the Effects Playground page.
 */
export const DEFAULT_FX_PLAYGROUND_EFFECT = 'explode';

// ============================================================================
// UI Refresh Configuration
// ============================================================================

/**
 * Interval for updating UI timestamps in driver cards and tables (milliseconds).
 * Updates "X seconds ago" displays every second for live feedback.
 */
export const UI_TIMESTAMP_UPDATE_INTERVAL_MS = 1000;

/**
 * Interval for sending system status updates to renderer (milliseconds).
 * Includes event counts and other system metrics.
 */
export const SYSTEM_STATUS_UPDATE_INTERVAL_MS = 1000;

/**
 * Duration for toast notifications to auto-hide (milliseconds).
 * Long enough to read, short enough not to annoy.
 */
export const TOAST_AUTO_HIDE_DURATION_MS = 5000;

/**
 * Delay between OTA WiFi credential updates when updating multiple drivers (milliseconds).
 * Prevents overwhelming the network and ensures each driver processes before the next.
 */
export const WIFI_UPDATE_DELAY_MS = 1000;

/**
 * Number of event simulator rows to display on the Simulator page.
 */
export const SIMULATOR_ROW_COUNT = 12;

/**
 * Width of the application sidebar drawer (pixels).
 */
export const DRAWER_WIDTH = 220;

/**
 * Height of telemetry chart components (pixels).
 */
export const CHART_HEIGHT = 144;

// ============================================================================
// Telemetry History Configuration
// ============================================================================

/**
 * Maximum number of telemetry data points to retain per driver.
 * Based on ~5 second telemetry intervals over 1 hour (~720 points).
 */
export const TELEMETRY_HISTORY_MAX_POINTS = 720;

// ============================================================================
// Events Rate Chart Configuration
// ============================================================================

/**
 * Sampling interval for events rate calculation (milliseconds).
 * Determines how often we sample and calculate events/second.
 */
export const EVENTS_RATE_SAMPLE_INTERVAL_MS = 5000;

/**
 * Duration of events rate history to retain (milliseconds).
 * 10 minutes of history.
 */
const EVENTS_RATE_HISTORY_DURATION_MS = 10 * 60 * 1000;

/**
 * Maximum number of events rate data points to retain.
 * Calculated from history duration and sample interval.
 */
export const EVENTS_RATE_MAX_POINTS = Math.ceil(
  EVENTS_RATE_HISTORY_DURATION_MS / EVENTS_RATE_SAMPLE_INTERVAL_MS,
);

/**
 * Color palette for driver lines in multi-driver charts.
 * Colors are assigned in order and cycle if more drivers than colors.
 */
export const DRIVER_CHART_COLORS = [
  '#2196f3', // blue
  '#4caf50', // green
  '#ff9800', // orange
  '#e91e63', // pink
  '#9c27b0', // purple
  '#00bcd4', // cyan
  '#f57c00', // deep orange
  '#795548', // brown
  '#607d8b', // blue-grey
  '#f44336', // red
];

/**
 * Maximum number of system errors to retain in memory.
 * Older errors are discarded when this limit is exceeded.
 */
export const MAX_SYSTEM_ERRORS = 100;

/**
 * Maximum number of event topics to track in the event store.
 * Oldest topics are evicted when this limit is exceeded.
 */
export const MAX_EVENT_TOPICS = 500;

// ============================================================================
// GitHub API Configuration
// ============================================================================

/** GitHub API endpoint for checking latest release */
export const GITHUB_RELEASES_API_URL =
  'https://api.github.com/repos/mfurniss/rgfx/releases/latest';
