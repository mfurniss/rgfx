# RGFX Architecture Improvement Plan

## Executive Summary

After comprehensive analysis of the RGFX codebase (~8,500 lines TypeScript, ~3,000 lines C++, ~1,000 lines Lua), the architecture is **generally well-designed** with clear separation between components. However, several areas in the Hub would benefit from refactoring to improve maintainability and scalability.

**Overall Assessment:**
- **Hub (TypeScript):** 7/10 - Good foundation, but some god classes and mixed responsibilities
- **ESP32 (C++):** 8.5/10 - Excellent dual-core design, clean effect system
- **Lua Scripts:** 9/10 - Well-organized, production-grade error handling

---

## Priority 1: Critical Refactorings (Hub)

### 1.1 Extract Discovery Services from MQTT Class

**Current Problem:** `mqtt.ts` handles 3 distinct concerns:
- Aedes MQTT broker lifecycle
- SSDP discovery via node-ssdp
- UDP broadcast discovery

**Proposed Solution:** Extract into separate classes:

```
src/
  mqtt/
    mqtt-broker.ts        # Aedes broker only (publish, subscribe, lifecycle)
    ssdp-discovery.ts     # SSDP server (NOTIFY broadcasts)
    udp-discovery.ts      # UDP broadcast discovery
    index.ts              # Re-exports, orchestrates startup
```

**Files to Modify:**
- `rgfx-hub/src/mqtt.ts` → Split into 3 files
- `rgfx-hub/src/main.ts` → Update imports

**Benefits:**
- Single responsibility per class
- Easier to test each discovery mechanism
- Can disable/enable discovery methods independently
- Clearer error handling per protocol

---

### 1.2 Break Down DriverRegistry.registerDriver()

**Current Problem:** `registerDriver()` is a 140-line god method handling:
- MAC address lookup in existing drivers
- Device ID migration logic
- Persistence lookup and creation
- Driver state updates
- Connection callbacks

**Proposed Solution:** Extract into focused methods:

```typescript
// driver-registry.ts
class DriverRegistry {
  registerDriver(telemetry: DriverTelemetry): Driver {
    const existingDriver = this.findDriverByMac(telemetry.macAddress);
    const driverId = this.resolveDriverId(existingDriver, telemetry);
    const driver = this.getOrCreateDriver(driverId, telemetry);
    this.updateDriverState(driver, telemetry);
    return driver;
  }

  private findDriverByMac(mac: string): Driver | undefined { ... }
  private resolveDriverId(existing: Driver | undefined, telemetry: DriverTelemetry): string { ... }
  private getOrCreateDriver(id: string, telemetry: DriverTelemetry): Driver { ... }
  private updateDriverState(driver: Driver, telemetry: DriverTelemetry): void { ... }
}
```

**Files to Modify:**
- `rgfx-hub/src/driver-registry.ts`

**Benefits:**
- Each method has single responsibility
- Easier to unit test individual operations
- Clearer error handling per operation
- Easier to add new registration logic

---

### 1.3 Extract Event Processing from main.ts

**Current Problem:** Event handling logic embedded directly in `main.ts`:
- Event topic counting
- Last value tracking
- Statistics aggregation
- Mapping engine invocation

**Proposed Solution:** Create `EventProcessingService`:

```typescript
// src/event-processing-service.ts
export class EventProcessingService {
  private topicCounts = new Map<string, number>();
  private topicLastValues = new Map<string, string>();
  private eventsProcessed = 0;

  constructor(
    private eventReader: EventFileReader,
    private mappingEngine: MappingEngine
  ) {}

  start(): void {
    this.eventReader.start((topic, message) => {
      this.processEvent(topic, message);
    });
  }

  private processEvent(topic: string, message: string): void { ... }

  getStats(): EventStats { ... }
}
```

**Files to Modify:**
- Create `rgfx-hub/src/event-processing-service.ts`
- `rgfx-hub/src/main.ts` → Use service instead of inline logic

**Benefits:**
- main.ts becomes pure orchestration
- Event processing logic testable in isolation
- Stats aggregation encapsulated
- Easier to add event filtering/transformation

---

## Priority 2: Important Improvements (Hub)

### 2.1 Move Connection Timeout from Zustand to Main Process

**Current Problem:** `driver-store.ts` has `setInterval` running every 5 seconds to check driver timeouts. This mixes business logic with state management.

**Proposed Solution:** Move timeout logic to main process:

```typescript
// src/driver-connection-monitor.ts
export class DriverConnectionMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private driverRegistry: DriverRegistry,
    private onDriverTimeout: (driver: Driver) => void
  ) {}

  start(intervalMs: number = 5000): void {
    this.intervalId = setInterval(() => this.checkTimeouts(), intervalMs);
  }

  private checkTimeouts(): void {
    const now = Date.now();
    for (const driver of this.driverRegistry.getAllDrivers()) {
      if (driver.connected && now - driver.lastSeen > TIMEOUT_MS) {
        this.onDriverTimeout(driver);
      }
    }
  }
}
```

**Files to Modify:**
- Create `rgfx-hub/src/driver-connection-monitor.ts`
- `rgfx-hub/src/renderer/store/driver-store.ts` → Remove interval logic
- `rgfx-hub/src/main.ts` → Instantiate monitor, send IPC on timeout

**Benefits:**
- State store only manages state (pure)
- Timeout logic runs in main process where driver data lives
- Avoids duplicate timeout checking
- Cleaner separation of concerns

---

### 2.2 Centralize IPC Channel Constants

**Current Problem:** IPC channel names are string literals scattered across codebase:
- `'driver:connected'`, `'system:status'`, etc.
- Easy to typo, no type safety

**Proposed Solution:** Create constants file:

```typescript
// src/ipc/channels.ts
export const IPC_CHANNELS = {
  // Driver events
  DRIVER_CONNECTED: 'driver:connected',
  DRIVER_DISCONNECTED: 'driver:disconnected',
  DRIVER_UPDATED: 'driver:updated',
  DRIVER_TEST_STATE: 'driver:test-state',

  // System events
  SYSTEM_STATUS: 'system:status',
  SYSTEM_FIRMWARE_CHANGED: 'system:firmware-changed',

  // Commands (renderer → main)
  SET_DRIVER_ID: 'set-driver-id',
  TRIGGER_EFFECT: 'trigger-effect',
  FLASH_OTA: 'flash-ota',
  // ... etc
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

**Files to Modify:**
- Create `rgfx-hub/src/ipc/channels.ts`
- Update all IPC handler registrations
- Update all renderer IPC calls
- Update preload.ts

**Benefits:**
- Type-safe channel references
- Single source of truth
- IDE autocomplete
- Easier refactoring

---

## Priority 3: Nice-to-Have (Lower Priority)

### 3.1 ESP32: Add State Guards to MQTT Callback

**Current Issue:** MQTT callback directly accesses `effectProcessor` pointer which could be null during matrix recreation.

**Proposed Fix:** Add null checks in callback:

```cpp
// mqtt.cpp callback
if (effectProcessor != nullptr) {
  effectProcessor->addEffect(...);
}
```

**Files to Modify:**
- `esp32/src/network/mqtt.cpp`

---

### 3.2 Add Integration Tests for Hub Services

**Current Gap:** Unit tests exist but no integration tests between services.

**Proposed:** Add integration test suite:
- Test DriverRegistry + DriverPersistence together
- Test EventProcessingService + MappingEngine together
- Test MQTT subscriptions → DriverRegistry flow

---

## Implementation Order

1. **Phase 1:** Extract Discovery Services (1.1)
   - Largest impact, most contained change
   - Improves testability significantly

2. **Phase 2:** Refactor DriverRegistry (1.2)
   - Improves readability and testability
   - Prerequisite for better error handling

3. **Phase 3:** Extract Event Processing (1.3)
   - Cleans up main.ts
   - Enables event filtering features

4. **Phase 4:** IPC Constants + Connection Monitor (2.1, 2.2)
   - Lower risk changes
   - Improves type safety

5. **Phase 5:** ESP32 guard + Integration tests (3.1, 3.2)
   - Polish items
   - Can be done anytime

---

## Files Summary

**New Files to Create:**
- `rgfx-hub/src/mqtt/mqtt-broker.ts`
- `rgfx-hub/src/mqtt/ssdp-discovery.ts`
- `rgfx-hub/src/mqtt/udp-discovery.ts`
- `rgfx-hub/src/mqtt/index.ts`
- `rgfx-hub/src/event-processing-service.ts`
- `rgfx-hub/src/driver-connection-monitor.ts`
- `rgfx-hub/src/ipc/channels.ts`

**Files to Modify:**
- `rgfx-hub/src/mqtt.ts` → Delete after extraction
- `rgfx-hub/src/main.ts` → Update orchestration
- `rgfx-hub/src/driver-registry.ts` → Break down methods
- `rgfx-hub/src/renderer/store/driver-store.ts` → Remove interval
- `rgfx-hub/src/preload.ts` → Use channel constants
- `rgfx-hub/src/ipc/*.ts` → Use channel constants
- `esp32/src/network/mqtt.cpp` → Add null guard

---

## What's NOT Recommended

The following areas are **already well-designed** and should NOT be refactored:

1. **ESP32 dual-core architecture** - Excellent separation, don't touch
2. **ESP32 effect system** - Clean IEffect interface, Canvas abstraction works well
3. **Lua interceptor pattern** - Clean, extensible, production-grade
4. **MappingEngine cascading system** - Well-designed, flexible
5. **Three-channel communication** - Files/UDP/MQTT each serve appropriate purpose
6. **Driver configuration system** - Unified config works well

---

## Questions for Consideration

1. **Scope:** Do you want to tackle all Priority 1 items, or start with just the MQTT extraction?

2. **Testing:** Should we add tests for each refactored component as we go, or batch testing at the end?

3. **IPC Constants:** The channel constants could also include type definitions for payloads. Worth the extra complexity?
