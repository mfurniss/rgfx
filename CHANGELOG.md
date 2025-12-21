# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Text effect auto-wrapping - text now wraps to the next row when it exceeds canvas width
  - Character-level wrapping (wraps at any character, not word boundaries)
  - First row respects starting x position, subsequent rows use full width
  - Accent shadows wrap identically, maintaining 4px offset
- Restart button on driver detail page with confirmation modal
  - Reboots driver without erasing any settings (WiFi, device ID, LED config)
  - Immediately updates driver state to disconnected (no timeout wait)
  - Shared `rebootDriver()` service function used by both restart button and config save
- Top-level Drivers page with dedicated navigation menu item
  - Drivers table moved from System Status page to new `/drivers` page
  - USB icon in sidebar navigation (position 2, after System Status)
  - Sidebar highlights correctly on driver detail and config sub-pages
  - Updated route structure: `/drivers`, `/drivers/:mac`, `/drivers/:mac/config`
  - New test suite for driver route navigation and back button behavior
- Telemetry history charts for driver monitoring
  - Animated line charts for Free Heap, FPS (with min/max bands), and RSSI
  - Uses Recharts library for visualization
  - Retains 1 hour of telemetry history (~720 data points per driver)
  - Ring buffer implementation for efficient fixed-size storage
  - New `TelemetryCharts` component displayed on connected driver detail pages
- Galaga 88 MAME interceptor for Namco System 1 (`galaga88_rgfx.lua`)
  - Reads score via C117 memory controller's program space at 0x300a14
  - Unpacked BCD format, 6 digits (supports up to 999,999)
  - Console output for all events in `event.lua`
- Event monitor persistence and reset functionality
  - Persist table data to localStorage between sessions using custom Zustand storage
  - Reset button with confirmation dialog that clears both UI and backend counters
- MAME shutdown event (`{rom}/shutdown`) to stop all effects when MAME quits
  - Hub clears effects on all connected drivers when receiving shutdown event
- Test coverage for previously untested modules:
  - `network-utils.ts` (getLocalIP, getBroadcastAddress)
  - `firmware-version-service.ts` (getCurrentVersion, needsUpdate)
  - `firmware-watcher.ts` (file watching, polling, events)
  - `system-monitor.ts` (status, firmware monitoring)
- Test mock factories to reduce duplication across test files
  - `createMockDriver()` and `createMockTelemetryPayload()` in `/src/__tests__/factories/`
  - Electron mocks consolidated in `electron.factory.ts`
- Canvas `fillBlock4x4()` inline method for optimized 4x4 block fills
- Per-RGB floor cutoff values for driver configuration
  - Values at or below the floor are cut off to 0 after gamma correction
  - Prevents dim red bleed at low brightness (red LEDs have lower forward voltage)
  - Configurable per channel: floorR, floorG, floorB (0-255, default 0)
  - New UI controls in Hub driver configuration page

### Changed
- Refactored test mocks to use vitest-mock-extended
  - Replaces inline mock object literals with type-safe `mock<T>()` and `MockProxy<T>`
  - Eliminates ~130 type casts and provides proper TypeScript inference
- Optimized plasma, background, and text effects to use `fillBlock4x4()` fast path
- Updated gradient presets: renamed Ocean to The Deep Blue, Freaky to Alien Goo
- Set plasma effect defaults to match Rainbow preset (speed 3, scale 4)
- Explode effect `hueSpread` default changed from 40 to 0
- Firmware version now uses content hash only (removed commit count from dev version)
- Hub clears effects on all drivers when app quits
- Skip disabled drivers in UDP broadcasts
- Refactored Lua globals to use `_G.rgfx` namespace to avoid polluting global namespace
- Display gamma correction, floor cutoff, and multi-panel layout in driver detail page
- Simplified InfoRowData to tuple format `[label, value]` for less verbose code
- Replace "Flash" with "Update" in firmware page user-facing text
- Enhanced UnifiedPanelEditor with drag-and-drop and click-to-rotate interactions
  - Panels can now be dragged and dropped to swap positions (using @dnd-kit library)
  - Clicking a panel rotates it 90° clockwise (cycles through 0°→90°→180°→270°→0°)
  - Added DragOverlay for smooth visual feedback during drag operations
  - Removed popover-based editing in favor of direct interaction
  - Updated helper text: "Drag to swap panels, click to rotate"
- Refactored IPC handlers to use global event bus for driver events
  - `flash-ota-handler.ts` now emits `driver:updated`, `driver:disconnected`, `flash:ota:state`, `flash:ota:progress`, `flash:ota:error` via event bus
  - `save-driver-config-handler.ts` now emits `driver:updated`, `driver:disconnected` via event bus
  - Removed `getMainWindow` dependency from both handlers
  - Event handlers in `driver-callbacks.ts` forward events to renderer via IPC
- Added `event:topic` to event bus for game event statistics
  - `processEvent()` in `main.ts` now emits via event bus instead of direct IPC

### Fixed
- Effects playground broadcasting to all drivers when none selected
  - Now requires at least one driver to be selected before triggering effects
- Driver selector now auto-selects on each page visit
  - Effects playground selects all connected drivers
  - Firmware page selects drivers needing update
  - No more persisted selection state
- ESP32 OTA flash effects not clearing (cross-core race condition)
  - Root cause: `clearEffects()` was called from Core 0 (OTA callback) while Core 1 (main loop) was still rendering
  - Both cores called `FastLED.show()` simultaneously - Core 1's render won the race
  - Solution: Use `pendingClearEffects` atomic flag to defer clear to Core 1
  - Core 0 sets flag in `ArduinoOTA.onStart()`, Core 1 processes it at start of `loop()`
  - All FastLED operations now happen on Core 1, eliminating the race
- ESP32 MQTT first-connection failures (Error -9)
  - Root cause: arduino-mqtt library is not reentrant - calling publish/subscribe/unsubscribe inside callbacks corrupts internal state
  - handleDriverConfig() was calling mqttClient.subscribe/unsubscribe inside the callback (mqtt_config_handler.cpp lines 54, 60)
  - Solution: Queue operations in callback, process them in main network task loop via processPendingMqttOperations()
  - Deferred operations: driver config, test mode changes, logging config
  - Lightweight operations (reset, reboot, clear-effects) still execute directly in callback

### Added
- Optional `accentColor` property for text and scroll_text effects
  - Renders a shadow/accent at +4,+4 pixel offset behind the main text
  - Uses REPLACE blend mode for crisp rendering
  - Accent is drawn first, then main text overlays it
  - If omitted, text renders as before (no accent)
- Text rendering effect for ESP32 LED drivers
  - DEN 8x8 bitmap font (CC0 Public Domain, by denzel5310)
  - Font data: 95 ASCII characters (32-126), 665 bytes in flash
  - Each font pixel renders as 4x4 canvas block (1:1 with physical LEDs after downsampling)
  - JSON API: `{"effect": "text", "text": "HELLO", "color": "#FF0000", "x": 0, "y": 0, "duration": 5000}`
  - Parameters: text (required), color (default white), x/y (default 0), duration (0 = permanent)
  - Hub Effects Playground UI with text input field
- FPS telemetry tracking in ESP32 driver firmware
  - Measures actual achieved frame rate (current, min, max since boot)
  - Sent with telemetry every 10 seconds via MQTT
  - Displayed in Hub driver card UI as "Frame Rate: X FPS (min: Y, max: Z)"

### Changed
- Optimized downsampleToMatrix() for significant CPU reduction
  - Replaced per-pixel getPixel() calls (with bounds checking) with direct buffer access
  - For 32x24 matrix: eliminates ~12,288 function calls and bounds checks per frame
  - Removed dead code: downsample.cpp and downsample.h (unused Canvas-to-Canvas downsampling)
- Native LED simulator (`tools/led-sim/`) for rapid effect development
  - Runs the same C++ effect code as ESP32 firmware on macOS/Linux
  - Uses raylib for visual LED rendering
  - Press SPACE to trigger effects, C to clear, D for auto-demo mode
  - Eliminates ~30s firmware flash cycles with ~2s compile-run cycles
- Hardware Abstraction Layer (HAL) in `esp32/src/hal/`
  - Platform-agnostic color types (`hal/types.h`) - CRGB, CHSV compatible with FastLED
  - Timing and logging abstractions (`hal/platform.h`) - millis(), random(), log()
  - Display interface (`hal/display.h`) - IDisplay for dependency injection
  - LED controller interface (`hal/led_controller.h`) - Abstracts FastLED operations
    - `show()`, `clear()`, `setBrightness()`, `setMaxPower()`, `setDither()`
    - ESP32 wraps real FastLED, native/test provide no-ops
  - ESP32 implementations wrap Arduino/FastLED
  - Native implementations use std::chrono, std::random, raylib

### Fixed
- Fixed MQTT Error -9 (LWMQTT_MISSING_OR_WRONG_PACKET) causing random driver disconnections
  - Telemetry was using QoS 2 (exactly-once) which requires a 4-message handshake
  - Brief WiFi micro-disconnects could break the TCP connection during the handshake
  - Changed telemetry from QoS 2 to QoS 0 (fire-and-forget)
  - QoS 0 is appropriate since telemetry is resent every 10 seconds anyway
  - Critical messages (status, test state) still use QoS 2 for guaranteed delivery
- Fixed periodic MQTT disconnections caused by keep-alive timeout
  - Default arduino-mqtt keep-alive was 10 seconds, causing timeouts during blocking operations
  - Broker discovery blocks for up to 6 seconds listening for UDP broadcasts
  - Increased MQTT keep-alive to 60 seconds (`MQTT_KEEPALIVE_SECONDS` constant)
  - Provides 90-second tolerance (1.5x per MQTT spec) for network hiccups
  - Telemetry every 10 seconds still provides frequent implicit heartbeats
- Fixed MQTT reconnection failures after WiFi disconnect/reconnect cycles
  - Broker discovery state (`mqttServerDiscovered`, `mqttServerIP`) was not reset in `cleanupNetworkServices()`
  - This caused drivers to repeatedly fail connecting to stale broker IPs (10 failures before re-discovery)
  - Now properly clears broker state on WiFi disconnect, forcing fresh discovery on reconnect
  - Added unit tests for network cleanup behavior
- Fixed UDP message queue race condition causing dropped effects on LED strip drivers
  - When hub sends multiple effects rapidly (e.g., blue explosion + white pulse for player death), the single-message buffer was being overwritten before processing
  - Replaced single `pendingMessage` buffer with 8-slot circular queue of raw JSON strings
  - Messages are now parsed on dequeue to avoid heap fragmentation
  - Main loop drains all queued messages per iteration

### Added
- Per-panel rotation support for unified LED matrix displays
  - Unified panel entries now use string format: `"<index><rotation>"` (e.g., `"0a"`, `"1b"`, `"2c"`, `"3d"`)
  - Rotation codes: `a`=0°, `b`=90°, `c`=180°, `d`=270° (clockwise)
  - Rotation suffix is optional; defaults to `a` (0°) if omitted (e.g., `"0"` = `"0a"`)
  - Allows individual panels in a unified display to be physically rotated
  - ESP32 applies rotation transforms when building coordinate map
- Games page in Hub UI showing configured games with their interceptor and transformer files
  - New "Games" menu item in sidebar navigation
  - Two-column table displaying Lua interceptor and JS transformer filenames
  - Clickable filenames open files in the default OS application
  - Data sourced from `rom_map.lua` configuration
- Generic `file:open` IPC handler for opening any file in the default OS application
  - Refactored `driver:open-log` handler to use the shared `openFile()` function
- MAME interceptor fallback loading - if ROM not found in `rom_map.lua`, tries loading `{rom_name}_rgfx.lua` directly
  - `rom_map.lua` now used for aliasing (multiple ROMs to one interceptor) and overrides only

### Fixed
- Fixed drivers showing as disconnected during OTA firmware updates
  - OTA progress now updates the driver's `lastSeenAt` timestamp
  - Prevents connection timeout from triggering while firmware is being uploaded
- Fixed firmware version sync between ESP32 builds and Hub app
  - `copy_firmware.py` now writes to `assets/esp32/firmware/` instead of `public/esp32/firmware/`
  - Hub's `FirmwareVersionService` reads from `assets/` (the bundled location) in dev mode
  - Ensures Hub correctly detects when drivers need firmware updates after OTA flashing

### Changed
- Renamed "mappings" to "transformers" throughout the Hub codebase
  - Moved example transformers from `config/mappings/` to `assets/transformers/`
  - Renamed `MappingEngine` → `TransformerEngine`, `MappingContext` → `TransformerContext`, etc.
  - Transformers are now copied to user config folder (`~/.rgfx/transformers/`) on startup
  - User-edited transformers are never overwritten (preserves customizations)
  - Hot-reload still supported for real-time transformer development
- Moved MAME Lua interceptors from `mame/` project into Hub
  - System modules (`rgfx.lua`, `event.lua`, `ram.lua`) now in `rgfx-hub/public/mame/`
  - User-editable interceptors (`rom_map.lua`, game scripts) now in `rgfx-hub/assets/interceptors/`
  - Interceptors copied to `~/.rgfx/interceptors/` on startup (user customizations preserved)
  - Updated `rgfx.lua` to load system modules from bundle, user files from config directory
  - Added `launch-mame.sh` script to `rgfx-hub/scripts/` for launching MAME with RGFX support
  - Removed `mame/` project from workspace (no longer needed)

### Added
- Unified multi-panel LED matrix support - combine multiple identical LED matrices into a single logical display
  - New `unified` property in `ledConfig` accepts a 2D array describing panel layout and wiring order
  - Example: `"unified": [[0, 1], [3, 2]]` creates a 2x2 grid with snake wiring
  - Hub computes effective dimensions and sends to ESP32 driver
  - ESP32 builds unified coordinate map for seamless rendering across panels
- Robotron: 2084 MAME Lua interceptor (`mame/lua/interceptors/robotron_rgfx.lua`)
- Robotron: 2084 hub mapper (`rgfx-hub/config/mappings/games/robotron.js`)
- Robotron ROM mapping in `rom_map.lua`
- Robotron technical documentation including sound system notes (`mame/lua/interceptors/robotron.md`)
- Sean Riddle's Robotron disassembly for reference (`mame/lua/interceptors/robomame.asm`)

### Changed
- Refactored ESP32 effects to use shared canvas architecture
  - Single canvas owned by EffectProcessor reduces memory from ~160KB to ~32KB
  - Effects receive Canvas& reference via constructor instead of owning their own
  - EffectProcessor clears canvas once per frame before rendering
  - Removed `getCanvas()` from IEffect interface
- Simplified Canvas from RGBA (32-bit) to RGB (24-bit) storage
  - 25% memory reduction in canvas storage (e.g., 32x32 canvas: 4KB → 3KB)
  - Alpha is now used only during blend operations via CRGBA input struct
  - New API: `drawPixel(x, y, CRGB)` for direct writes, `drawPixel(x, y, CRGBA, BlendMode)` for blending
  - BlendMode supports REPLACE, ALPHA, ADDITIVE, and AVERAGE modes
- Removed arbitrary MAX_LEDS_PER_PIN limit (300) - memory allocation is the real constraint

### Fixed
- ESP32 native unit tests failing in CI due to missing include paths for subdirectories (graphics, effects, utils)
- Hub renderer crash when importing constants.ts - moved CONFIG_DIRECTORY to paths.ts (Node.js-only)

### Added
- ESP32 native tests to pre-commit hook to catch test failures before pushing

### Changed
- Updated CLAUDE.md with comprehensive project overview describing the three main projects (mame, rgfx-hub, esp32)
- Added Key Applications section and Change Logs section to CLAUDE.md
- Fixed typos in CLAUDE.md: "added a the" -> "added to the", "matricies" -> "matrices", "commited" -> "committed", "No not" -> "Do not", "shoud" -> "should"
- Added rgfx-hub-developer agent configuration
