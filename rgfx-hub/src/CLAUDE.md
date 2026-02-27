# src/ Root Modules

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Main process modules at the root of `src/`. Subdirectories have their own CLAUDE.md files.

## App Lifecycle

- `main.ts` — Electron entry point; initializes app, IPC channels, and core services
- `preload.ts` — Exposes secure IPC API to renderer via `window.rgfx`
- `shutdown.ts` — Graceful shutdown; sends clear-effects to all connected drivers

## Driver Management

- `driver-registry.ts` — Tracks connected drivers and their state (connection, telemetry, LED config)
- `driver-callbacks.ts` — IPC event handlers for driver connection state changes
- `driver-config.ts` — Reads/writes LED driver configurations (YAML in `~/.rgfx/drivers/`)
- `driver-id-validator.ts` — Validates driver IDs (pattern, length constraints)
- `driver-log-persistence.ts` — Persists driver logs to per-driver files in `~/.rgfx/logs/`
- `upload-config-to-driver.ts` — Uploads LED config to drivers via MQTT

## Event & Transformer Pipeline

- `event-file-reader.ts` — Watches MAME event log file; emits events as new entries appear. Handles file truncation (resets position), I/O errors (falls back to polling), and log trimming when file exceeds size threshold.
- `transformer-engine.ts` — Transforms game events into LED effects using cascading handler precedence. Emits `system:error` events (with filePath and stack trace) when game transformers fail to load. File watcher hot-reloads `.js` transformers on save; also watches `bitmaps/*.json` and reloads all transformers when sprite files change.
- `gif-loader.ts` — Loads animated GIFs and converts to bitmap effect format (palette + frame arrays)
- `sprite-loader.ts` — Loads JSON sprite files extracted from ROM data by `sprite-extract.lua`; derives width/height/frameCount from the images array. Returns `GifBitmapResult` (palette is optional for sprites using default PICO-8 palette)

## Asset Installers

Copy bundled defaults to `~/.rgfx/` on first run (skip existing files to preserve user customizations).

- `interceptor-installer.ts` — Installs interceptor scripts to `~/.rgfx/interceptors/`. Excludes LSP type stubs (`mame.lua`) via `EXCLUDED_FILES`.
- `transformer-installer.ts` — Installs transformer scripts to `~/.rgfx/transformers/`
- `led-hardware-installer.ts` — Installs LED hardware definitions to `~/.rgfx/led-hardware/`
- `led-hardware-manager.ts` — Loads and manages LED hardware definition files (JSON)

## Infrastructure

- `log-manager.ts` — Manages log files (system, event, driver); provides disk usage stats and clear-all
- `system-monitor.ts` — Monitors firmware versions, network status, UDP stats
- `serial-port-config.ts` — Serial port auto-selection for WebUSB/ESP32

## Type Declarations

- `types.ts` — Shared types for IPC (AppInfo, LED configs: LEDChipset supports WS2812B/WS2811/SK6812/WS2814)
- `css-modules.d.ts` — CSS module import declarations
- `vite-env.d.ts` — Vite environment variable declarations

<\!-- No per-file license headers — see root LICENSE -->
