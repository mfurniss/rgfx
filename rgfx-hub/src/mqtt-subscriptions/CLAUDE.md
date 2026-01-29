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

### Driver Status

**Topic:** `rgfx/driver/{driverId}/status`

Receives MQTT Last Will and Testament (LWT) messages:
- `online` - Driver connected to broker
- `offline` - Driver disconnected (crash, power loss, network issue)

**Actions:**
- Marks driver as disconnected
- Ignores offline during OTA updates (expected disconnect)
- Sends `driver:disconnected` IPC to renderer
- Updates system status

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

**Note:** `SystemMonitor.getSystemStatus()` is synchronous. Tests mock it with `mockReturnValue()` not `mockResolvedValue()`.

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
