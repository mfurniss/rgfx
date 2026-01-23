# Renderer Services

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Services running in the renderer process for firmware flashing operations.

## Services

### OTA Flash Service

**File:** [ota-flash-service.ts](ota-flash-service.ts)

Handles Over-The-Air firmware updates to multiple drivers in parallel:
- `flashViaOTA(driversToFlash, firmwareVersion, callbacks)` - Flash multiple drivers concurrently
- `getDriversToFlash(selectedDriverIds, allDrivers)` - Filter to connected drivers only
- `generateResultMessage(result, firmwareVersion)` - Format success/failure message

**Callbacks:**
- `onLog(message)` - Log messages for display
- `onDriverStatusChange(driverId, status)` - Per-driver progress updates

**Return:** `OtaFlashResult` with `successCount`, `totalCount`, `failedDrivers[]`

### USB Flash Service

**File:** [usb-flash-service.ts](usb-flash-service.ts)

Handles USB serial firmware flashing with automatic chip detection:
- `flashViaUSB(getPort, callbacks)` - Flash single device via USB serial

**Multi-chip Support:**
- Automatically detects chip type (ESP32, ESP32-S3) via esptool-js
- Maps detected chip to firmware variant using `mapChipNameToVariant()`
- Loads correct firmware files from manifest variants
- Rejects unsupported chip types with clear error message

**Process:**
1. Load and validate `manifest.json` with all chip variants
2. Connect to device via Web Serial API (esptool-js)
3. Detect chip type from device
4. Load and verify firmware files for detected chip (size + SHA256)
5. Flash all partition files with progress reporting (eraseAll=true for clean NVS)
6. Reset device after successful flash

**Note:** USB flashing uses `eraseAll: true` to ensure clean NVS initialization on fresh devices. This erases all settings including WiFi credentials, so the user must reconfigure after flashing.

**Return:** `FlashResult` with `success`, `firmwareVersion`, `chipType`, `error?`
