# src/ Root Modules

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Main process modules at the root of `src/`. Subdirectories have their own CLAUDE.md files.

## App Lifecycle

- `main.ts` — Electron entry point; initializes app, IPC channels, and core services. Menu bar is minimal: macOS app menu (Quit/Hide/About) + Help > Documentation only (no File/Edit/View menus)
- `preload.ts` — Exposes secure IPC API to renderer via `window.rgfx` (44 methods: invoke, push, and send channels)
- `shutdown.ts` — Graceful shutdown; sends clear-effects to all connected drivers

## Driver Management

- `driver-registry.ts` — Tracks connected drivers and their state (connection, telemetry, LED config)
- `driver-callbacks.ts` — Simplified IPC event handlers for driver connection state changes; business logic moved to `driver-connect-service`
- `driver-config.ts` — Reads/writes LED driver configurations (YAML in `~/.rgfx/drivers/`)
- `driver-id-validator.ts` — Validates driver IDs (pattern, length constraints)
- `driver-log-persistence.ts` — Persists driver logs to per-driver files in `~/.rgfx/logs/`
- `upload-config-to-driver.ts` — Uploads LED config to drivers via MQTT

## Event & Transformer Pipeline

- `event-file-reader.ts` — Watches MAME event log file; emits events as new entries appear. Handles file truncation (resets position), I/O errors (falls back to polling), and log trimming when file exceeds size threshold. Strips null bytes from read buffers (guards against sparse file holes) and truncates long invalid topics in error messages to prevent console flooding. Tests use generic paths (`/tmp/test/`) for test data.
- `transformer-engine.ts` — Transforms game events into LED effects using cascading handler precedence. Delegates module loading to `TransformerModuleLoader`. Caches failed game transformer loads in `failedGameLoads` set to avoid retrying on every event; cleared on full reload or when a specific game file is reloaded. Emits `system:error` events (with filePath and stack trace) when game transformers fail to load. File watcher hot-reloads `.js` transformers on save; also watches `bitmaps/*.json` and reloads all transformers when sprite files change.
- `transformer-module-loader.ts` — Extracted from transformer-engine; handles loading and caching of transformer modules (game, subject, property, default)
- `transformer-utils.ts` — Utility functions injected into transformer context via `utils` object. Includes math helpers (`scaleLinear`, `randomInt`, `randomElement`, `hslToRgb`, `pick`), async helpers (`sleep`, `trackedTimeout`, `trackedInterval`, `debounce`, `throttleLatest`, `exclusive`), and formatting (`formatNumber`). These were moved from userland JS (`transformers/utils/`) to hub TypeScript for better testing and control.
- `gif-loader.ts` — Loads animated GIFs and converts to bitmap effect format (palette + frame arrays)
- `sprite-loader.ts` — Loads JSON sprite files extracted from ROM data by `sprite-extract.lua`; derives width/height/frameCount from the images array. Returns `GifBitmapResult` (palette is optional for sprites using default PICO-8 palette)

## Asset Installers

Copy bundled defaults to `~/.rgfx/` on first run (skip existing files to preserve user customizations). Supports `alwaysOverwrite` predicate for system files (e.g., `.d.ts` type declarations) that should be refreshed on every launch. All installers accept an optional `forceOverwrite` parameter to overwrite all existing files.

- `interceptor-installer.ts` — Installs interceptor scripts (`.lua`) and config files (`.json`, e.g. `rom_map.json`) to `~/.rgfx/interceptors/`.
- `transformer-installer.ts` — Installs transformer scripts to `~/.rgfx/transformers/`. Uses `alwaysOverwrite` for `.d.ts` files (type declarations for IntelliSense).
- `led-hardware-installer.ts` — Installs LED hardware definitions to `~/.rgfx/led-hardware/`
- `launch-script-installer.ts` — Installs platform-specific MAME launch script (`launch-mame.sh` on macOS, `launch-mame.bat` on Windows) to `~/.rgfx/`. Reads template from bundled `assets/scripts/`, replaces `{{RGFX_LUA_PATH}}` and `{{ROM_PATH}}` placeholders with resolved paths, sets executable permission on macOS. Only writes if file does not exist (preserves user edits).
- `asset-reinstaller.ts` — Orchestrator that calls all four installers with `forceOverwrite: true`. Used by the `assets:reinstall` IPC handler for the Settings UI reinstall button.
- `led-hardware-manager.ts` — Loads and manages LED hardware definition files (JSON)

## Infrastructure

- `log-manager.ts` — Manages log files (system, event, driver); provides disk usage stats and clear-all
- `system-monitor.ts` — Monitors firmware versions, network status, UDP stats. Provides `getFullStatus()` method for assembling complete system status. Includes `startUpdateChecker()` which checks GitHub releases for newer hub versions (5s delay, single check). Update availability is included in `SystemStatus.updateAvailable` as a release URL string. Firmware versions come from `manifest.json` bundled alongside the `.bin` files in `assets/esp32/firmware/`. The manifest version must match the version baked into the firmware binaries (generated by `esp32/inject_version.py` at build time) — a mismatch causes the "new firmware available" banner to persist after flashing. Version comparison uses the `semver` package for proper semver handling (prerelease, build metadata). Dev build detection (version contains `-dev`) is handled in both main process (`firmware-version-service.ts`) and renderer (`firmware-helpers.ts`).
- `serial-port-config.ts` — Electron Web Serial API configuration. Always calls `event.preventDefault()` per Electron docs, auto-selects ESP32 ports by VID/PID, and waits up to 3s for late-arriving devices via `serial-port-added` event (ESP32-S3 native USB can be slow to enumerate on Windows). Grants blanket serial permissions via `setPermissionCheckHandler` and `setDevicePermissionHandler`.

## Utilities

- `utils/asset-installer.ts` — Shared asset installation logic used by interceptor/transformer/led-hardware installers. `getBundledAssetDir` resolves to `<appPath>/assets/<subdir>` in dev, `<resourcesPath>/<subdir>` in production (electron-builder `extraResources` copies dirs into Resources/). Supports `alwaysOverwrite` predicate for system files that should be refreshed on every launch rather than skipped if they exist. Supports `forceOverwrite` option to overwrite all existing files (used by reinstall feature).
- `utils/color-utils.ts` — Color helpers: `parseAmbilight` (12-bit → 24-bit), `hslToHex` (HSL → hex)
- `utils/http-context.ts` — HTTP helpers: `createHttpContext`, `mergeHeaders`
- `utils/firmware-paths.ts` — Firmware directory helpers: `getFirmwareDir`, `getFirmwareFilePath`
- `utils/error-utils.ts` — `getErrorMessage` for safe error-to-string conversion

## Import Conventions

**Do NOT use dynamic imports (`import()`) in production code unless 100% necessary.** This is a desktop app — bundle size and bandwidth are irrelevant. Use static `import` statements for everything. Dynamic imports add unnecessary complexity and make code harder to follow. **Exception: dynamic imports in tests are fine** — vitest often requires them for module isolation.

**Use deep imports for `@mui/icons-material`** — barrel imports cause EMFILE errors in vitest by resolving all ~7000 icon modules. Use `import FooIcon from '@mui/icons-material/Foo'` instead of `import { Foo as FooIcon } from '@mui/icons-material'`.

## Test Infrastructure

Global test setup (`__tests__/setup.ts`) provides:
- `vi.mock('electron-log/main')` — default log mock (files needing custom log refs override per-file)
- `vi.mock('electron')` — default ipcMain mock (files needing `app`, `shell`, `dialog` etc. override per-file)
- `cleanup()` in `afterEach` — component tests should NOT call `cleanup()` themselves

Key test helpers:
- `__tests__/helpers/ipc-handler.helper.ts` — `setupIpcHandlerCapture()` for IPC handler tests
- `__tests__/factories/` — Mock factories for drivers, telemetry, MQTT subscriptions
- `__tests__/factories/mqtt.factory.ts` — `createMqttSubscriptionMock()` for MQTT subscription tests

Tests for components using `use-stick-to-bottom` must mock the module:
```typescript
vi.mock('use-stick-to-bottom', () => ({
  useStickToBottom: () => ({ scrollRef: { current: null }, contentRef: { current: null } }),
}));
```

## Type Declarations

- `types/` — Shared types split into focused modules:
  - `types/driver.ts` — Driver, telemetry, and LED config types (LEDChipset supports WS2812B/WS2811/SK6812/WS2814, DriverTelemetry includes `ledHealthy?: boolean`)
  - `types/system.ts` — System status and monitoring types
  - `types/app.ts` — AppInfo (version, licensePath, defaultRgfxConfigDir, defaultMameRomsDir) and application-level types
  - `types/global.d.ts` — Global type declarations
  - `types/index.ts` — Barrel re-export for backward-compatible imports via `@/types`
- `css-modules.d.ts` — CSS module import declarations
- `vite-env.d.ts` — Vite environment variable declarations

<\!-- No per-file license headers — see root LICENSE -->
