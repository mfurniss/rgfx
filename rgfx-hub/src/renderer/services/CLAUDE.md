# Renderer Services

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Services running in the renderer process for firmware flashing operations.

## Services

### OTA Flash Service

**File:** [ota-flash-service.ts](ota-flash-service.ts)

Handles Over-The-Air firmware updates:
- Initiates OTA flash via IPC handler
- Listens for progress events from main process
- Reports flash state and progress to UI

### USB Flash Service

**File:** [usb-flash-service.ts](usb-flash-service.ts)

Handles USB serial firmware flashing:
- Uses Web Serial API to communicate with ESP32
- Uses esptool-js for flashing protocol
- Loads firmware files via IPC handlers
- Verifies file checksums against manifest
- Reports progress during flash operation
