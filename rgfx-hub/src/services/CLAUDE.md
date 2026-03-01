# Services

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Main process services for firmware management, application lifecycle, and error handling.

## Files

### firmware-version-service.ts

Singleton service that reads firmware versions from `manifest.json` in the bundled firmware directory.

- **Location**: `assets/esp32/firmware/` (dev) or `resources/firmware/` (packaged)
- **Multi-chip support**: Each chip variant (ESP32, ESP32-S3) tracks its own version independently
- **Version source**: Reads `version` field from each variant in `manifest.json`

Key methods:
- `getVersions()`: returns `Record<SupportedChip, string>` with all chip versions
- `getVersionForChip(chipType)`: returns version string for a specific chip type
- `needsUpdate(driverVersion, chipType)`: compares driver version with the target version for its chip type

This per-chip version tracking prevents false "update needed" notifications when only one chip variant has been rebuilt.

### firmware-watcher.ts

EventEmitter that monitors firmware directory for changes.

- Uses `fs.watch()` for real-time detection with polling fallback
- Emits `firmware-updated` event when version changes
- Poll interval: 5 seconds (fallback mode)

Key methods:
- `start()`: begins watching (call in main process setup)
- `stop()`: cleanup for app quit
- `getCurrentVersion()`: cached version string

### global-error-handler.ts

Centralized error handling for uncaught exceptions and unhandled rejections.

- Prevents app crashes from socket errors (ECONNRESET, EPIPE, etc.)
- Suppresses ECONNRESET during OTA (expected from MQTT connections dropping)
- Sends error events to renderer via `system:error` event bus
- Logs all errors via electron-log
- Suppresses socket errors during shutdown (EPIPE flood prevention)
- Shared `handleError()` eliminates duplication between exception and rejection handlers

Key methods:
- `registerGlobalErrorHandlers(log)`: installs process error handlers
- `addActiveOtaDriver(driverId)`: tracks driver as actively updating (suppresses ECONNRESET)
- `removeActiveOtaDriver(driverId)`: removes driver from active OTA set
- `setShuttingDown()`: suppresses socket errors during app quit

### service-factory.ts

Factory for creating and wiring up all main process services.

- Creates instances of all services with dependency injection
- `SystemMonitor` receives `MqttBroker` to query actual service status
- Wraps transformer `broadcast` with `validateTransformerEffect` to apply Zod schema defaults before sending to drivers
- Contains `parseAmbilight()` (12-bit → 24-bit color expansion), `hslToHex()` (HSL → hex conversion), `createGifLoader()`, and `createSpriteLoader()` utility functions passed to transformer engine context
- Provides `ServiceContainer` interface for accessing services
- Used by `service-startup.ts` for initialization

### service-startup.ts

Orchestrates service initialization on app startup.

- Initializes services in correct order with dependency resolution
- Passes `systemMonitor` to IPC handlers for cleanup operations (e.g., clearing UDP stats on driver delete)
- Starts MQTT broker, network manager, and other services
- Creates `eventProcessor` callback that forwards events to transformer engine, increments stats, sends IPC events, and emits system:error for interceptor errors
- Sets up firmware monitoring callback to broadcast system status updates
- Returns `PowerSaveHandle` for cleanup during app shutdown

### system-error-tracker.ts

Tracks and aggregates system errors for display in UI.

- Maintains array of recent errors with timestamps
- Deduplicates repeated errors
- Provides errors to SystemStatus for renderer display

### event-stats.ts

Tracks event processing statistics.

- Counts events processed per topic
- Provides stats for system status display

### event-bus.ts

Simple pub/sub event bus for inter-service communication.

- Decouples services from direct dependencies
- Used for system-wide events like errors, status updates
- `AppEventMap` interface (internal, not exported) defines all event names and payload types

## Usage

```typescript
import { firmwareVersionService } from './services/firmware-version-service';
import { FirmwareWatcher } from './services/firmware-watcher';
import { setupGlobalErrorHandler } from './services/global-error-handler';

// Check if driver needs update
const needsUpdate = firmwareVersionService.needsUpdate(driver.version);

// Watch for firmware file changes
const watcher = new FirmwareWatcher();
watcher.on('firmware-updated', (newVersion) => {
  // Handle new firmware available
});
watcher.start();

// Setup global error handling
setupGlobalErrorHandler(mainWindow);
```

<\!-- No per-file license headers — see root LICENSE -->
