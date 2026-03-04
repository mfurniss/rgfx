# MQTT Subscriptions

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains handlers for MQTT messages received from ESP32 drivers. Each subscription module listens to specific topics and updates application state accordingly.

---

## Architecture

The subscription system follows a consistent pattern:

1. **Subscribe** to an MQTT topic pattern
2. **Parse** incoming JSON payloads with Zod validation
3. **Update** driver registry or other state
4. **Notify** renderer via IPC events

All subscriptions are registered at startup via [index.ts](index.ts).

---

## Files

| File | Topic Pattern | Purpose |
|------|---------------|---------|
| `index.ts` | - | Registers all subscriptions |
| `driver-telemetry.ts` | `rgfx/system/driver/telemetry` | Hardware, firmware, and metrics updates |
| `driver-status.ts` | `rgfx/driver/+/status` | Connection state (online/offline via LWT) |
| `driver-test-state.ts` | `rgfx/driver/+/test` | LED test mode active/inactive |
| `driver-log.ts` | `rgfx/driver/+/log` | Remote log messages from drivers |
| `driver-error.ts` | `rgfx/system/driver/error` | Effect validation and system errors from drivers |

---

## Subscription Details

### Driver Telemetry

**Topic:** `rgfx/system/driver/telemetry`

Receives periodic heartbeat messages containing:
- Hardware info (chip model, cores, flash size, PSRAM)
- Firmware info (version, SDK version, sketch size)
- Runtime metrics (free heap, uptime, RSSI)
- Network info (IP, MAC, hostname, SSID)

**Actions:**
- Registers new drivers or updates existing ones
- Sends `driver:updated` IPC to renderer
- Supports fallback for old firmware (minimal validation)
- Emits `system:error` when `ledHealthy === false` (debounced per-driver using a `Set<string>` of MAC addresses to avoid firing every telemetry cycle)

### Driver Status

**Topic:** `rgfx/driver/{macAddress}/status`

Receives MQTT Last Will and Testament (LWT) messages. The topic contains the driver's MAC address (not driver ID), so `getDriverByMac()` is used for lookup:
- `online` - Driver connected to broker
- `offline` - Driver disconnected (crash, power loss, network issue)

**Actions:**
- Marks driver as disconnected
- Ignores offline during OTA updates (expected disconnect)
- Sends `driver:disconnected` IPC to renderer
- Updates system status via `systemMonitor.getFullStatus()` (replaces inline assembly)
- Logs use `driver.id` (not raw MAC from topic) for readable output

### Driver Test State

**Topic:** `rgfx/driver/{driverId}/test`

Receives LED test mode state changes from drivers.

**Actions:**
- Updates `testActive` flag on driver
- Sends `driver:updated` IPC to renderer

### Driver Log

**Topic:** `rgfx/driver/{driverId}/log`

Receives remote log messages from drivers:
```json
{"level": "info|error", "message": "...", "timestamp": 12345}
```

**Actions:**
- Persists log entries to driver log file
- Uses Hub timestamp (driver sends uptime, not wall clock)

### Driver Error

**Topic:** `rgfx/system/driver/error`

Receives error reports from drivers (effect validation failures, queue overflow, etc.):
```json
{"driverId": "rgfx-driver-0001", "source": "bitmap", "error": "missing required 'centerX' prop", "payload": {...}}
```

**Note:** The `source` field identifies the error origin (effect name like "bitmap", or system component like "udp"). This matches the ESP32's `publishError()` field name.

**Actions:**
- Queue overflow errors ("Queue full") are logged at `warn` level (expected under high load)
- All other errors are logged at `error` level
- Emits `system:error` event for UI display regardless of level

---

## Dependencies

All subscription handlers receive these via dependency injection:

```typescript
interface MqttSubscriptionsDeps {
  mqtt: MqttBroker;           // For subscribing to topics
  driverRegistry: DriverRegistry;  // For updating driver state
  systemMonitor: SystemMonitor;    // For system status updates (async getSystemStatus())
  driverLogPersistence: DriverLogPersistence;  // For log file I/O
  getMainWindow: () => BrowserWindow | null;   // For IPC to renderer
  getEventsProcessed: () => number;  // For system status
}
```

**Note:** `SystemMonitor.getFullStatus()` provides the complete assembled system status. `driver-wifi-response` uses `getErrorMessage()` utility for error handling. The returned `SystemStatus` includes `discovery` (not `udpServer`) for discovery service state.

---

## Data Flow

```
ESP32 Driver
    │
    ▼
MQTT Broker
    │
    ▼
Subscription Handler
    │
    ├──▶ Driver Registry (update state)
    │
    └──▶ IPC to Renderer (notify UI)
              │
              ▼
         Driver Store (Zustand)
              │
              ▼
         React Components
```

<\!-- No per-file license headers — see root LICENSE -->
