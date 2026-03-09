# Renderer Services

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Services running in the renderer process for firmware flashing operations.

## Services

### OTA Flash Service

**File:** [ota-flash-service.ts](ota-flash-service.ts)

Handles Over-The-Air firmware updates to multiple drivers in parallel. Imports types from `firmware-flash-store`:
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

**Library:** Uses `tasmota-webserial-esptool` (not `esptool-js`). This library handles multi-strategy bootloader entry (UnixTight, Classic, inverted variants) for reliable cross-platform operation, especially on Windows with CP210x USB-UART bridges.

**Multi-chip Support:**
- Automatically detects chip type (ESP32, ESP32-S3) via `loader.chipName`
- Maps detected chip to firmware variant using `mapChipNameToVariant()`
- Loads correct firmware files from manifest variants
- Rejects unsupported chip types with clear error message

**Process:**
1. Load and validate `manifest.json` with all chip variants
2. Connect to device via Web Serial API (`ESPLoader.initialize()`)
3. Detect chip type from device
4. Load and verify firmware files for detected chip (size + SHA256)
5. Upload flasher stub (`runStub()`)
6. Flash each partition file with progress reporting (region erase handled by `flashDeflBegin` internally)
7. Reset device to firmware mode after successful flash

**Note:** No full flash erase is performed. The `flashDeflBegin` call inside `flashData` handles erasing regions being written. A full `eraseFlash()` was removed because it caused "Invalid head of packet" failures on Windows with CP2102 USB-UART bridges due to prolonged serial activity at 115200 baud. NVS and other unwritten regions are preserved across flashes.

**Return:** `FlashResult` with `success`, `firmwareVersion`, `chipType`, `error?`

**Manifest Format:** The manifest now stores version per-variant (not at the top level). The service validates the manifest and extracts the version from the detected chip's variant.

### ESP Loader Factory

**File:** [esp-loader-factory.ts](esp-loader-factory.ts)

Isolates the `tasmota-webserial-esptool` unsafe type boundary. The library's `ESPLoader` class has `any[]` typed properties that cascade ESLint `no-unsafe-*` errors. This factory module is the only file that imports the library directly — it exports clean typed interfaces (`EspLoaderApi`, `EspStub`, `FlashLogger`) and a `createEspLoader()` factory function. The file-level `eslint-disable` for `no-unsafe-assignment`/`no-unsafe-call` is intentional and contained to this single file.

<\!-- No per-file license headers — see root LICENSE -->
