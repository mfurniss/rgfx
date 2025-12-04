# Renderer Stores

This folder contains Zustand stores for managing client-side state in the renderer process. Each store follows the Zustand pattern with state, actions, and optional selectors.

---

## Stores

### Driver Store

**File:** [driver-store.ts](driver-store.ts)

**Purpose:** Manages the state of all ESP32 drivers and system status.

**State:**
- `drivers: Driver[]` - Array of all known drivers (connected and disconnected)
- `systemStatus: SystemStatus` - Hub system status (MQTT broker, UDP server, event reader, etc.)

**Actions:**
- `onDriverConnected(driver)` - Handles driver connection events. Adds new drivers or updates existing ones. Handles ID migration when a driver's MAC matches but ID differs.
- `onDriverDisconnected(driver)` - Handles driver disconnection events
- `onDriverUpdated(driver)` - Updates driver state (telemetry, config changes, etc.)
- `onSystemStatusUpdate(status)` - Updates the system status

**Selectors:**
- `connectedDrivers()` - Returns only connected drivers
- `getDriverById(id)` - Finds a driver by ID

**Features:**
- Automatic connection timeout monitoring (checks every 5s, marks drivers as disconnected after 30s without telemetry)
- Integrates with notification store to show connect/disconnect notifications
- Uses Zustand devtools for debugging

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

### Event Store

**File:** [event-store.ts](event-store.ts)

**Purpose:** Tracks game event statistics for the events dashboard.

**State:**
- `topics: Map<string, EventTopic>` - Map of event topics to their statistics

**Actions:**
- `onEventTopic(topic, count, lastValue?)` - Updates statistics for an event topic

**EventTopic Shape:**
```typescript
interface EventTopic {
  topic: string;
  count: number;
  lastValue?: string;
}
```

**Features:**
- Uses Zustand devtools for debugging

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

**Actions:**
- `setDriverTableSort(field, order)` - Updates driver table sort preferences
- `setTestEffectsState(effect, props, drivers, selectAll)` - Saves test effects page state
- `setSimulatorRow(index, eventLine, autoInterval)` - Updates a simulator row

**Features:**
- Uses Zustand persist middleware to save preferences to localStorage
- Only persists sort preferences and simulator rows (not test effects state)
- Storage key: `rgfx-ui-preferences`
