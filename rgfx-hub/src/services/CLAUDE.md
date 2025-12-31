# Services

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Main process services for firmware management.

## Files

### firmware-version-service.ts

Singleton service that reads firmware version from bundled files.

- **Location**: `assets/esp32/firmware/` (dev) or `resources/firmware/` (packaged)
- **Filename pattern**: `rgfx-firmware.{version}.bin`
- **Version extraction**: strips prefix and `.bin` suffix

Key methods:
- `getCurrentVersion()`: reads firmware directory, extracts version from filename
- `needsUpdate(driverVersion)`: compares driver version with bundled firmware

### firmware-watcher.ts

EventEmitter that monitors firmware directory for changes.

- Uses `fs.watch()` for real-time detection with polling fallback
- Emits `firmware-updated` event when version changes
- Poll interval: 5 seconds (fallback mode)

Key methods:
- `start()`: begins watching (call in main process setup)
- `stop()`: cleanup for app quit
- `getCurrentVersion()`: cached version string

## Usage

```typescript
import { firmwareVersionService } from './services/firmware-version-service';
import { FirmwareWatcher } from './services/firmware-watcher';

// Check if driver needs update
const needsUpdate = firmwareVersionService.needsUpdate(driver.version);

// Watch for firmware file changes
const watcher = new FirmwareWatcher();
watcher.on('firmware-updated', (newVersion) => {
  // Handle new firmware available
});
watcher.start();
```
