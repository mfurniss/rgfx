# IPC Handlers

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains Electron IPC (Inter-Process Communication) handlers that enable communication between the renderer process (UI) and the main process. Each handler is registered via `ipcMain.handle()` and can be invoked from the renderer using `ipcRenderer.invoke()`.

## Handler Registration

All handlers are registered via `registerIpcHandlers()` in [index.ts](index.ts), which accepts a dependency injection object containing shared services.

---

## Handlers

### `driver:set-id`

**File:** [set-id-handler.ts](set-id-handler.ts)

**Purpose:** Sends a command to rename a driver's ID on the device itself.

**Parameters:**
- `driverId: string` - Current driver ID
- `newId: string` - New driver ID to set

**Returns:** `{ success: boolean, error?: string }`

**Behavior:**
1. Validates the new ID format using `validateDriverId()`
2. Looks up the driver in the registry
3. Publishes MQTT message to `rgfx/driver/{driverId}/set-id` with payload `{ id: newId }`

---

### `driver:flash-ota`

**File:** [flash-ota-handler.ts](flash-ota-handler.ts)

**Purpose:** Performs Over-The-Air (OTA) firmware update to a connected ESP32 driver.

**Parameters:**
- `driverId: string` - ID of the driver to flash

**Returns:** `{ success: boolean, error?: string }`

**Behavior:**
1. Validates driver exists and is connected
2. Locates firmware binary (`firmware.bin`) from app resources
3. Uses `esp-ota` library to upload firmware to driver's IP address on port 3232
4. Emits progress events to renderer via `flash:ota:state` and `flash:ota:progress` channels

---

### `effect:trigger`

**File:** [trigger-effect-handler.ts](trigger-effect-handler.ts)

**Purpose:** Manually triggers a visual effect by broadcasting it to all drivers via UDP.

**Parameters:**
- `payload: EffectPayload` - Effect configuration object containing effect type and parameters

**Returns:** void

**Behavior:**
- Broadcasts the effect payload to all drivers using the UDP client

---

### `driver:send-command`

**File:** [send-driver-command-handler.ts](send-driver-command-handler.ts)

**Purpose:** Sends an arbitrary MQTT command to a specific driver.

**Parameters:**
- `driverId: string` - Target driver ID
- `command: string` - Command name (e.g., "reboot", "clear")
- `payload?: string` - Optional command payload

**Returns:** void

**Behavior:**
- Publishes MQTT message to `rgfx/driver/{driverId}/{command}` with optional payload

---

### `driver:update-config`

**File:** [update-driver-config-handler.ts](update-driver-config-handler.ts)

**Purpose:** Pushes the current LED configuration to a connected driver.

**Parameters:**
- `driverId: string` - Target driver ID

**Returns:** void

**Behavior:**
1. Looks up driver by ID and retrieves MAC address
2. Calls `uploadConfigToDriver()` to push configuration via MQTT

---

### `driver:save-config`

**File:** [save-driver-config-handler.ts](save-driver-config-handler.ts)

**Purpose:** Saves driver configuration to persistent storage and optionally pushes it to the device.

**Parameters:**
- `config: PersistedDriverFromSchema` - Full driver configuration object

**Returns:** `{ success: boolean }`

**Behavior:**
1. Validates configuration against `PersistedDriverSchema` using Zod
2. Handles driver rename if ID changed (creates new, copies settings, deletes old)
3. Updates description, LED config, and remote logging settings
4. Refreshes runtime registry from persistence
5. Notifies renderer of updated driver via `driver:updated` channel
6. If driver is connected, automatically uploads new config to device

---

### `led-hardware:list`

**File:** [list-led-hardware-handler.ts](list-led-hardware-handler.ts)

**Purpose:** Returns the list of available LED hardware definitions.

**Parameters:** None

**Returns:** Array of LED hardware configurations

**Behavior:**
- Delegates to `LEDHardwareManager.listHardware()`

---

### `driver:open-log`

**File:** [open-driver-log-handler.ts](open-driver-log-handler.ts)

**Purpose:** Opens the log file for a driver in the system's default application.

**Parameters:**
- `driverId: string` - Target driver ID

**Returns:** `{ success: boolean, error?: string }`

**Behavior:**
1. Gets log file path from `DriverLogPersistence`
2. Delegates to `openFile()` from open-file-handler

---

### `file:open`

**File:** [open-file-handler.ts](open-file-handler.ts)

**Purpose:** Opens any file in the system's default application.

**Parameters:**
- `filePath: string` - Absolute path to the file to open

**Returns:** `{ success: boolean, error?: string }`

**Behavior:**
1. Verifies file exists
2. Opens file using `shell.openPath()`

---

### `games:list`

**File:** [list-games-handler.ts](list-games-handler.ts)

**Purpose:** Returns a list of configured games with their interceptor and transformer file paths.

**Parameters:** None

**Returns:** `GameInfo[]` - Array of game information objects

**Behavior:**
1. Parses `rom_map.lua` to extract unique interceptor names
2. For each interceptor, derives the corresponding transformer name
3. Checks file existence for both interceptor and transformer files
4. Returns array with file paths (null if file doesn't exist)

---

### `event:simulate`

**File:** [simulate-event-handler.ts](simulate-event-handler.ts)

**Purpose:** Simulates a game event for testing event-to-effect mappings.

**Parameters:**
- `eventLine: string` - Event in format "topic payload" (space-delimited)

**Returns:** void

**Behavior:**
1. Parses event line into topic and payload
2. Processes event through `MappingEngine.handleEvent()`
3. Calls `onEventProcessed()` callback to update statistics

---

### `firmware:get-manifest` / `firmware:get-file`

**File:** [firmware-files-handler.ts](firmware-files-handler.ts)

**Purpose:** Provides access to bundled firmware files for USB flashing.

**Channels:**
- `firmware:get-manifest` - Loads and returns `manifest.json` with firmware version and checksums
- `firmware:get-file` - Loads a firmware binary file by name (with path traversal protection)

**Returns:** JSON object (manifest) or Buffer (firmware file)

---

### `app:get-info`

**File:** [get-app-info-handler.ts](get-app-info-handler.ts)

**Purpose:** Returns application metadata and default paths.

**Parameters:** None

**Returns:** `AppInfo` object containing:
- `version` - App version from package.json
- `licensePath` - Path to LICENSE file
- `docsPath` - Path to documentation
- `defaultRgfxConfigDir` - Default `~/.rgfx` config directory
- `defaultMameRomsDir` - Default `~/mame-roms` directory

---

### `dialog:select-directory`

**File:** [select-directory-handler.ts](select-directory-handler.ts)

**Purpose:** Opens a native folder picker dialog.

**Parameters:**
- `title?: string` - Dialog title
- `defaultPath?: string` - Starting directory

**Returns:** Selected directory path or `null` if cancelled

---

### `fs:verify-directory`

**File:** [verify-directory-handler.ts](verify-directory-handler.ts)

**Purpose:** Validates if a path is a valid directory.

**Parameters:**
- `path: string` - Path to verify (supports `~` expansion)

**Returns:** `boolean` - True if path exists and is a directory

---

### `gif:load`

**File:** [load-gif-handler.ts](load-gif-handler.ts)

**Purpose:** Loads and parses a GIF file for bitmap effects.

**Parameters:**
- `path: string` - Path to GIF file (relative to transformers directory)

**Returns:** Parsed GIF data with frames and palette

**Behavior:**
1. Resolves relative paths from transformers directory
2. Uses `gif-frames` library to extract frames
3. Returns frame data compatible with bitmap effect schema

---

## Error Handling

All handlers follow a standardized error handling pattern:
- Validation errors return `{ success: false, error: string }`
- Unexpected errors are logged and re-thrown
- OTA errors are tracked via global error handler with driver ID context
