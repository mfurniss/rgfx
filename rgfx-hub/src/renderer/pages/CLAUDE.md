# Renderer Pages

This folder contains the main page components for the RGFX Hub application. Each page is a React functional component that renders a full-page view accessible via React Router.

---

## Pages

### System Status Page

**File:** [system-status-page.tsx](system-status-page.tsx)

**Route:** `/` (home)

**Purpose:** Main dashboard showing system health and all connected drivers.

**Features:**
- Displays system status (MQTT broker, UDP server, event reader, hub IP, etc.)
- Shows a sortable table of all known drivers with connection status
- Uses `SystemStatus` and `DriverListTable` components

---

### Driver Detail Page

**File:** [driver-detail-page.tsx](driver-detail-page.tsx)

**Route:** `/driver/:mac`

**Purpose:** Shows detailed information for a single driver.

**Features:**
- Looks up driver by MAC address (immutable identifier)
- Renders full `DriverCard` component with telemetry, stats, and actions
- Shows error state if driver not found

---

### Driver Config Page

**File:** [driver-config-page.tsx](driver-config-page.tsx)

**Route:** `/driver/:mac/config`

**Purpose:** Configuration form for editing driver settings.

**Features:**
- Form fields: Driver ID, description, remote logging level
- LED configuration: hardware selection, GPIO pin, offset, brightness limit, dithering, power settings
- Uses `react-hook-form` with Zod validation (`PersistedDriverSchema`)
- Loads available LED hardware definitions from hub
- Saves configuration via IPC and auto-pushes to connected drivers
- Handles driver rename (ID change) seamlessly

---

### Event Monitor Page

**File:** [event-monitor-page.tsx](event-monitor-page.tsx)

**Route:** `/events`

**Purpose:** Displays real-time game event statistics.

**Features:**
- Sortable table showing all event topics received from MAME
- Columns: topic name, occurrence count, last value
- Formats numeric values with hex representation for 16-bit values
- Uses `EventStore` for reactive updates

---

### Effects Playground Page

**File:** [effects-playground-page.tsx](effects-playground-page.tsx)

**Route:** `/effects`

**Purpose:** Interactive testing interface for LED effects.

**Features:**
- Dropdown to select effect type (pulse, wipe, explode, etc.)
- JSON editor for effect properties with real-time Zod validation
- Driver selection checkboxes with "select all" option
- Triggers effects via UDP broadcast to selected drivers
- State persisted in `UiStore` across navigation

---

### Simulator Page

**File:** [simulator-page.tsx](simulator-page.tsx)

**Route:** `/simulator`

**Purpose:** Manual event simulation for testing event-to-effect mappings.

**Features:**
- 6 configurable event rows (persisted across sessions)
- Each row has: event input field, trigger button, auto-trigger interval selector
- Event format: `topic payload` (space-delimited)
- Auto-trigger intervals: off, 1 second, 5 seconds
- Events processed through mapping engine just like real MAME events

---

### Firmware Page

**File:** [firmware-page.tsx](firmware-page.tsx)

**Route:** `/firmware`

**Purpose:** Firmware flashing interface for ESP32 drivers.

**Features:**
- Two flash methods: USB Serial and OTA WiFi
- **USB Serial:**
  - Serial port selection via Web Serial API
  - Uses `esptool-js` for direct ESP32 flashing
  - Loads and verifies firmware files against manifest checksums
  - Progress reporting and device reset after flash
- **OTA WiFi:**
  - Driver selection dropdown (connected drivers only)
  - Uses `esp-ota` library via IPC handler
  - Real-time progress events from main process
- Log display showing flash progress
- Confirmation dialog for USB flashing
- Result dialog showing success/failure

---

### Settings Page

**File:** [settings-page.tsx](settings-page.tsx)

**Route:** `/settings`

**Purpose:** Application settings and preferences.

**Features:**
- **Appearance:** Theme mode selection (system/light/dark) via MUI color scheme
- **Directories:**
  - RGFX Config Directory (required) - for interceptors, transformers, driver configs
  - MAME ROMs Directory (optional) - for ROM file location
- Directory validation with folder picker dialogs
- Saves to `UiStore` (localStorage persistence)
- Gets default paths from `AppInfoStore`

---

### Games Page

**File:** [games-page.tsx](games-page.tsx)

**Route:** `/games`

**Purpose:** View configured games and their associated scripts.

**Features:**
- Sortable table showing all configured games
- Columns: MAME ROM name, interceptor script, transformer script
- Clickable links to open interceptor/transformer files in default editor
- Data loaded via `window.rgfx.listGames()` IPC call

---

### About Page

**File:** [about-page.tsx](about-page.tsx)

**Route:** `/about`

**Purpose:** Application information and credits.

**Features:**
- Application name and description
- Version number
- System architecture overview (Hub, Drivers, Communication)
- Technology stack details
- License and copyright information (MPL 2.0)
