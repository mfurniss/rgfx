# Renderer Stores

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains Zustand stores for managing client-side state in the renderer process. Each store follows the Zustand pattern with state, actions, and optional selectors.

---

## Shared Patterns

### RingBuffer

Several stores use `RingBuffer<T>` from `../utils/ring-buffer` for memory-efficient time-series data. Old entries are automatically dropped when the buffer reaches capacity.

### Store Integration

Stores can call into each other:
- `system-status-store` calls `notify()` from notification-store
- `system-status-store` calls `updateFromStatus()` on events-rate-history-store
- `system-status-store` reads connected drivers from driver-store

---

## Stores

### Driver Store

**File:** [driver-store.ts](driver-store.ts)

**Purpose:** Manages the state of all ESP32 drivers.

**State:**
- `drivers: Driver[]` - Array of all known drivers (connected and disconnected)

**Actions:**
- `onDriverConnected(driver)` - Handles driver connection events. Adds new drivers or updates existing ones. Handles ID migration when a driver's MAC matches but ID differs. Uses extracted `upsertDriver` helper.
- `onDriverDisconnected(driver)` - Handles driver disconnection events
- `onDriverUpdated(driver)` - Updates driver state (telemetry, config changes, etc.)

**Selectors:**
- `connectedDrivers()` - Returns only connected drivers
- `getDriverById(id)` - Finds a driver by ID

**Features:**
- Automatic connection timeout monitoring (checks every 5s, marks drivers as disconnected after 30s without telemetry)
- Integrates with notification store to show connect/disconnect notifications
- Uses Zustand devtools for debugging

---

### System Status Store

**File:** [system-status-store.ts](system-status-store.ts)

**Purpose:** Manages hub system status (split from driver-store). Tracks component health and operational metrics.

**State:**
- `systemStatus: SystemStatus` - Hub status containing:
  - `mqttBroker: string` - MQTT broker state
  - `discovery: string` - Discovery services state
  - `eventReader: string` - Event reader state
  - `driversConnected: number` - Count of connected drivers
  - `driversTotal: number` - Total drivers
  - `hubIp: string` - Hub's IP address
  - `eventsProcessed: number` - Total events processed
  - `hubStartTime: number` - Timestamp of hub startup
  - `udpMessagesSent: number` - Total UDP messages sent
  - `udpMessagesFailed: number` - Failed UDP messages
  - `udpStatsByDriver: Record<string, UdpStats>` - Per-driver UDP statistics
  - `systemErrors: array` - Array of system errors
  - `ffmpegAvailable: boolean` - Whether ffmpeg is installed (for video effect)

**Actions:**
- `onSystemStatusUpdate(newStatus)` - Updates status and triggers notifications for IP changes and new system errors; updates events-rate-history-store

---

### Events Rate History Store

**File:** [events-rate-history-store.ts](events-rate-history-store.ts)

**Purpose:** Tracks UDP event rates per driver over time for charting. Uses ring buffer for memory efficiency.

**State:**
- `history: RingBuffer<EventsRateDataPoint>` - Historical rate data (max from `EVENTS_RATE_MAX_POINTS`)
- `currentStats: Map<string, DriverStatsSnapshot>` - Current UDP sent counts per driver
- `previousStats: Map<string, DriverStatsSnapshot>` - Previous sample's stats for delta calculation
- `knownDrivers: Set<string>` - Set of driver IDs we've seen
- `version: number` - Incremented on changes to trigger re-renders

**Actions:**
- `updateFromStatus(udpStatsByDriver, connectedDriverIds)` - Updates current stats from SystemStatus; rebuilds `knownDrivers` from current data to evict stale entries
- `sampleRates()` - Calculates rate deltas and pushes data point to history (called by interval timer)
- `getHistory()` - Returns history as array for chart rendering
- `getDriverIds()` - Returns sorted list of known driver IDs
- `clear()` - Clears all history and stats

**Exported Functions:**
- `startEventsRateSampling()` - Starts periodic sampling (uses `EVENTS_RATE_SAMPLE_INTERVAL_MS`)

---

### Telemetry History Store

**File:** [telemetry-history-store.ts](telemetry-history-store.ts)

**Purpose:** Stores per-driver telemetry data points over time for health charts (heap, FPS, WiFi signal).

**State:**
- `histories: Map<string, RingBuffer<TelemetryDataPoint>>` - Per-driver ring buffers
- `version: number` - Incremented on changes to trigger re-renders

**TelemetryDataPoint Shape:**
```typescript
interface TelemetryDataPoint {
  timestamp: number;
  freeHeap: number;
  heapSize: number;
  maxAllocHeap: number;
  fps: number;
  minFps: number;
  maxFps: number;
  rssi: number;
}
```

**Actions:**
- `addDataPoint(driverId, dataPoint)` - Adds telemetry point; creates buffer lazily
- `getHistory(driverId)` - Returns array of all telemetry points
- `clearHistory(driverId)` - Deletes telemetry buffer for specific driver (frees memory)
- `clearAllHistory()` - Clears all telemetry data

---

### Notification Store

**File:** [notification-store.ts](notification-store.ts)

**Purpose:** Manages toast notifications displayed to the user.

**State:**
- `notifications: Notification[]` - Array of active notifications

**Actions:**
- `addNotification(notification)` - Adds a new notification with auto-generated UUID
- `removeNotification(id)` - Removes a notification by ID

**Notification Shape:**
```typescript
interface Notification {
  id: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  driverId?: string;  // Optional link to a driver
}
```

---

### Debounced Storage

**File:** [debounced-storage.ts](debounced-storage.ts)

**Purpose:** Wraps `localStorage` with debounced `setItem` for Zustand persist middleware.

**Exports:**
- `createDebouncedStorage(delay?)` - Returns a `StateStorage` adapter. `getItem`/`removeItem` pass through immediately; `setItem` is debounced via lodash-es to batch rapid writes.

**Used by:** Event Store, UI Store (both with 500ms delay)

---

### Event Store

**File:** [event-store.ts](event-store.ts)

**Purpose:** Tracks game event statistics for the events dashboard.

**State:**
- `topics: Partial<Record<string, EventTopicData>>` - Map of event topics to their statistics

**Actions:**
- `onEvent(topic, payload?)` - Buffers event into module-level Map; schedules 250ms flush timer
- `reset()` - Clears buffer, cancels flush timer, and clears all topics

**Features:**
- Events are batched in a module-level `Map` outside Zustand (zero serialization overhead per event), then flushed into state every 250ms in a single `set()` call. This reduces `JSON.stringify` calls from ~100/sec to ~4/sec during gameplay.
- Uses debounced persist storage (500ms) to avoid blocking UI during rapid writes to localStorage
- Evicts oldest topics when exceeding `MAX_EVENT_TOPICS` limit

---

### UI Store

**File:** [ui-store.ts](ui-store.ts)

**Purpose:** Persists user interface preferences across sessions.

**State:**
- `driverTableSortField: SortField` - Current sort field for driver table ('id' | 'name' | 'ip' | 'status')
- `driverTableSortOrder: SortOrder` - Sort direction ('asc' | 'desc')
- `testEffectsSelectedEffect: string` - Selected effect type on test page
- `testEffectsPropsJson: string` - JSON props for test effect
- `testEffectsSelectedDrivers: string[]` - Selected driver IDs for testing
- `testEffectsSelectAll: boolean` - Whether "select all" is checked
- `simulatorRows: SimulatorRow[]` - Array of 6 simulator row configurations
- `wifiSsid: string` - Persisted WiFi SSID for driver configuration
- `wifiPassword: string` - Persisted WiFi password for driver configuration
- `stripExplosionLifespanScale: number` - Scaling factor for explosion effect lifespan on strips
- `driverFallbackEnabled: boolean` - Whether driver fallback mode is active (default: true)

**Actions:**
- `setDriverTableSort(field, order)` - Updates driver table sort preferences
- `setTestEffectsState(effect, props, drivers, selectAll)` - Saves test effects page state
- `setSimulatorRow(index, eventLine, autoInterval)` - Updates a simulator row
- `resetAllAutoIntervals()` - Sets all simulator rows' autoInterval to 'off' (used by Clear All Effects)
- `setWifiCredentials(ssid, password)` - Saves WiFi credentials for reuse
- `setStripExplosionLifespanScale(scale)` - Sets explosion lifespan scale for strips
- `setDriverFallbackEnabled(enabled)` - Toggles driver fallback mode

**Note:** Firmware flash state (flash method, OTA progress, etc.) has been moved to `firmware-flash-store.ts`.

**Features:**
- Uses Zustand persist middleware with debounced storage (500ms) to avoid blocking UI during rapid updates
- Persists sort preferences, simulator rows, WiFi credentials, and selected effect
- Storage key: `rgfx-ui-preferences` (version 5)

---

### App Info Store

**File:** [app-info-store.ts](app-info-store.ts)

**Purpose:** Holds static application information fetched from the main process.

**State:**
- `appInfo: AppInfo | null` - Application metadata (name, version, default directories)

**Actions:**
- `getAppInfo()` - Fetches app info via IPC (`window.rgfx.getAppInfo()`)

**AppInfo Shape:**
```typescript
interface AppInfo {
  version: string;
  platform: string;
  licensePath: string;
  docsPath: string;
  defaultRgfxConfigDir: string;
  defaultMameRomsDir: string;
}
```

**Features:**
- Loaded once at app startup
- Provides default values for settings page
- No persistence (always fetched fresh from main process)

---

### Firmware Flash Store

**File:** [firmware-flash-store.ts](firmware-flash-store.ts)

**Purpose:** Dedicated transient store for firmware flash state, extracted from `ui-store.ts`.

**State:**
- `flashMethod: FlashMethod` - Current flash method ('ota' | 'usb')
- OTA progress tracking per driver

**Actions:**
- `setFirmwareFlashMethod(method)` - Sets flash method. Used directly by firmware page ToggleButtonGroup — no local state copy, avoids bidirectional sync loops

**Note:** This store is *not* persisted — flash state is transient and resets on app restart.

<\!-- No per-file license headers — see root LICENSE -->
