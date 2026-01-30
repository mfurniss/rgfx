# Configuration

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Centralized configuration constants, paths, and initialization.

## Files

### constants.ts

All tunable constants in one place. Categories:

**Network & Communication**
- `MQTT_DEFAULT_PORT`: 1883
- `MQTT_QOS_LEVEL`: 2 (exactly once)
- `UDP_PORT`: 8888 (LED effects)
- `UDP_MAX_PACKET_SIZE`: 1472 (MTU limit for UDP)
- `SSDP_PORT`: 1900, `SSDP_SERVICE_URN`: broker discovery
- `UDP_DISCOVERY_PORT`: 8889, `UDP_DISCOVERY_INTERVAL_MS`: 5000

**Driver Connection**
- `DRIVER_CONNECTION_TIMEOUT_MS`: 30000 (3x telemetry interval)
- `DRIVER_CONNECTION_CHECK_INTERVAL_MS`: 5000

**Window**
- `MAIN_WINDOW_WIDTH`: 1000, `MAIN_WINDOW_HEIGHT`: 800
- `MAIN_WINDOW_ZOOM_FACTOR`: 0.9
- `OPEN_DEVTOOLS_IN_DEV`: false

**Event File Reader**
- `EVENT_LOG_FILENAME`: 'interceptor_events.log'
- `EVENT_FILE_POLL_INTERVAL_MS`: 5000

**Driver ID Validation**
- `DRIVER_ID_PATTERN`: lowercase alphanumeric with hyphens
- `MIN_DRIVER_ID_LENGTH`: 3, `MAX_DRIVER_ID_LENGTH`: 32

**UI**
- `UI_TIMESTAMP_UPDATE_INTERVAL_MS`: 1000
- `TOAST_AUTO_HIDE_DURATION_MS`: 5000
- `DEFAULT_FX_PLAYGROUND_EFFECT`: 'background'

**Effects**
- `MAX_GRADIENT_COLORS`: 64 (maximum colors in gradient array)
- `HEX_COLOR_RRGGBB_REGEX`: Regex for validating #RRGGBB hex color strings

### paths.ts

File system paths (main process only).

- `CONFIG_DIRECTORY`: `~/.rgfx`
- `TRANSFORMERS_DIRECTORY`: `~/.rgfx/transformers`
- `INTERCEPTORS_DIRECTORY`: `~/.rgfx/interceptors`

**Important**: Do not import paths.ts from renderer process (uses Node.js `os.homedir()`).

### logging.ts

Configures electron-log for the application.

- Sets log file location
- Configures log levels
- Formats log output

### zod-config.ts

Configures Zod for consistent error messages across the app.

- Sets custom error map
- Standardizes validation messages
