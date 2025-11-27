# Hub UI Restructure + Unified Driver Config

## Overview
1. **UI Changes**: Driver list table as main page, detailed view accessible via "More Info"
2. **Config Changes**: Single unified JSON config file containing all known drivers and their LED configs

---

## Part 1: Unified Driver Configuration

### Replace DriverConfigManager with Unified Config System

**New file:** `src/driver-persistence.ts`
- Single JSON file: `config/drivers.json`
- Structure:
```json
{
  "version": "1.0",
  "drivers": [
    {
      "id": "f89a58",
      "name": "rgfx-driver-f89a58",
      "type": "driver",
      "ledConfig": {
        "friendly_name": "Dev Board 8x8 Matrix",
        "led_devices": [...],
        "settings": {...}
      }
    }
  ]
}
```

**What gets persisted:**
- ✅ `id` - MAC-based unique identifier (never changes)
- ✅ `name` - User-editable device name
- ✅ `type` - "driver" or "controller"
- ✅ `ledConfig` - Hardware LED configuration (nested object)
- ❌ `ip` - **NOT persisted** (runtime-only, discovered fresh via MQTT each session)
- ❌ `lastSeen` - **NOT persisted** (runtime-only, updated on heartbeats)
- ❌ `connected` - **NOT persisted** (runtime state, always starts false on Hub startup)
- ❌ `stats` - **NOT persisted** (runtime metrics reset on Hub restart)

**IP Address Handling:**
- Drivers announce current IP via MQTT `driver/connect` message
- IP stored in `DriverRegistry` memory and Zustand store (with localStorage)
- Displayed in UI from Zustand state (shows last known IP even if disconnected)
- Not written to `drivers.json` (DHCP can change it between sessions)

**Responsibilities:**
- Load all known drivers from `drivers.json` on startup
- Persist driver discovery (add new drivers when first seen)
- Save/load LED configs (nested in each driver entry)
- Provide drivers to DriverRegistry for runtime tracking

**Methods:**
- `loadConfig()` - Load all drivers from JSON
- `saveConfig()` - Save all drivers to JSON
- `addDriver(id, name, type)` - Add newly discovered driver
- `updateDriver(id, updates)` - Update driver metadata (name, type)
- `getDriverLEDConfig(id)` - Get LED config for driver
- `setDriverLEDConfig(id, config)` - Update LED config for driver
- `getAllDrivers()` - Get all known drivers (for UI)

### Update DriverRegistry

**File:** `src/driver-registry.ts`
- Constructor accepts `DriverPersistence` instance
- On startup, loads all known drivers from persistence (all start as `connected: false`)
- When driver connects/heartbeats:
  - If new driver: Add to persistence + memory
  - If existing: Update runtime state only (don't save `lastSeen` to disk)
- Stats (`mqttMessagesReceived`, etc.) are runtime-only, not persisted

### Update Main Process

**File:** `src/main.ts`
- Initialize `DriverPersistence` first
- Pass to `DriverRegistry` constructor
- When new driver discovered: Persist via `DriverPersistence.addDriver()`

---

## Part 2: UI Restructure

### 1. Install React Router
```bash
npm install react-router-dom --save-dev
npm install @types/react-router-dom --save-dev
```

### 2. Create Driver List Table Component

**New file:** `src/renderer/components/driver-list-table.tsx`
- Material UI `Table` with columns:
  - **Device ID** (driver.id)
  - **Name** (driver.name)
  - **IP Address** (driver.ip)
  - **Status** (Chip: green=connected, red=disconnected)
  - **First Seen** (formatted relative time)
  - **Actions** ("More Info" icon button → navigate to `/driver/:id`)
- Empty state: "No drivers discovered yet..."
- Live timestamps (update every second)
- Sortable columns (optional, can add later)

### 3. Create Driver Detail Page

**New file:** `src/renderer/pages/driver-detail.tsx`
- Route: `/driver/:id`
- Reads `id` from route params
- Fetches driver from Zustand store using `getDriverById(id)` selector
- Shows full `DriverCard` component with all details
- "← Back to Drivers" button (navigate to `/`)
- 404 state if driver not found

### 4. Update Zustand Store

**File:** `src/renderer/store/driver-store.ts`
- Add selector: `getDriverById: (id: string) => Driver | undefined`

### 5. Update App Component

**File:** `src/renderer/app.tsx`
- Wrap in `BrowserRouter`
- Define routes:
  - `/` → Driver list table page
  - `/driver/:id` → Driver detail page
- Keep `SystemStatus` component on all pages (above routes)

### 6. Update Main.tsx

**File:** `src/renderer/main.tsx`
- No changes needed (App already wrapped in providers)

---

## Part 3: Migration Plan

### Migrate Existing Driver Configs

**One-time migration script** (can be manual or automated):
1. Read existing `config/drivers/*.json` files (old format)
2. Convert to new unified `config/drivers.json` format
3. For each old config file:
   - Extract `driver_id` (MAC address like `44:1D:64:F8:9A:58`)
   - Create short ID (last 6 chars: `f89a58`)
   - Build new driver entry with `ledConfig` nested
4. Preserve old files as backup (don't delete automatically)

**Example migration:**
```
OLD: config/drivers/44:1D:64:F8:9A:58.json
NEW: config/drivers.json with entry { id: "f89a58", ledConfig: {...} }
```

---

## Benefits

1. **Single source of truth** - One config file for all driver data
2. **Simpler persistence** - No need to manage multiple files
3. **Better UI** - Table view scales well, detail on-demand
4. **Persistent discovery** - Hub remembers all drivers ever seen
5. **Clean separation** - Runtime stats in memory, static config on disk
