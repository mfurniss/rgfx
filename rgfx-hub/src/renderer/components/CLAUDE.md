# Renderer Components

This folder contains reusable React components for the RGFX Hub renderer process.

---

## Layout Components

### AppLayout

**File:** [app-layout.tsx](app-layout.tsx)

**Purpose:** Main application shell with permanent sidebar drawer and content area.

**Features:**
- Fixed-width (240px) permanent drawer with app title and theme toggle
- Contains `SidebarNav` for navigation
- Main content area with overflow scrolling

---

### SidebarNav

**File:** [sidebar-nav.tsx](sidebar-nav.tsx)

**Purpose:** Navigation menu for the sidebar.

**Features:**
- Lists all main routes: System Status, Event Monitor, Firmware, FX Playground, Simulator, Settings, About
- Highlights active route based on current path
- Uses Material UI icons for each nav item

---

## Display Components

### InfoRow

**File:** [info-row.tsx](info-row.tsx)

**Purpose:** Displays a single label-value pair in horizontal layout.

**Props:**
- `label: string` - The label text
- `value: string | number` - The value to display

---

### InfoSection

**File:** [info-section.tsx](info-section.tsx)

**Purpose:** Groups related information with a title, icon, and list of InfoRows.

**Props:**
- `title: string` - Section title
- `icon: ReactNode` - Icon displayed next to title
- `rows: InfoRowData[]` - Array of label-value pairs
- `showDivider?: boolean` - Show divider above section
- `children?: ReactNode` - Additional content below rows
- `titleAction?: ReactNode` - Action buttons aligned right of title

---

### SystemStatusItem

**File:** [system-status-item.tsx](system-status-item.tsx)

**Purpose:** Displays a single system metric in a responsive grid cell.

**Props:**
- `name: string` - Metric name
- `value: string | number` - Metric value

---

### SystemStatus

**File:** [system-status.tsx](system-status.tsx)

**Purpose:** Dashboard panel showing overall hub system status.

**Features:**
- Displays: Version, IP Address, Uptime, MQTT Broker, UDP Server, Event Reader, Drivers Connected, Events Processed
- Live uptime counter (updates every second when visible)
- Real-time event count via IPC subscription

---

### LogDisplay

**File:** [log-display.tsx](log-display.tsx)

**Purpose:** Scrollable log output display with auto-scroll behavior.

**Props:**
- `messages: string[]` - Array of log messages to display

**Features:**
- Monospace font for log readability
- Auto-scrolls to bottom when new messages arrive (with adaptive buffer)
- Max height of 300px with overflow scrolling

---

## Driver Components

### DriverListTable

**File:** [driver-list-table.tsx](driver-list-table.tsx)

**Purpose:** Sortable table displaying all drivers.

**Props:**
- `drivers: Driver[]` - Array of drivers to display

**Features:**
- Sortable columns: Device ID, IP Address, Status
- Sort preferences persisted in UiStore
- Status chips: Connected, Disconnected, Update Required, Update Available, Needs Configuration
- Row click navigates to driver detail page
- Test LED button in actions column

---

### DriverCard

**File:** [driver-card.tsx](driver-card.tsx)

**Purpose:** Detailed view of a single driver with all telemetry and configuration.

**Props:**
- `driver: Driver` - The driver to display

**Features:**
- Sticky header with back button, driver ID, status chip, and configure button
- Sections: LED Configuration, Network, Driver Telemetry, Hardware, Memory
- Live uptime calculation based on driver's reported uptime
- Test LED, Reset, and Open Log buttons
- Alert shown when LED configuration is missing

---

### TestLedButton

**File:** [test-led-button.tsx](test-led-button.tsx)

**Purpose:** Toggle button to activate/deactivate LED test mode on a driver.

**Props:**
- `driver: Driver` - The driver to control

**Features:**
- Tooltip describes test pattern (strip vs matrix layout)
- Sends config update before enabling test mode
- Visual state change when test is active
- Disabled when driver is disconnected or request pending

---

### ResetDriverButton

**File:** [reset-driver-button.tsx](reset-driver-button.tsx)

**Purpose:** Button to factory reset a driver with confirmation dialog.

**Props:**
- `driver: Driver` - The driver to reset

**Features:**
- Warning tooltip explaining reset consequences
- Confirmation dialog listing what will be erased (ID, LED config, WiFi)
- Sends reset command via MQTT

---

### OtaDriverSelector

**File:** [ota-driver-selector.tsx](ota-driver-selector.tsx)

**Purpose:** Dropdown to select a driver for OTA firmware update.

**Props:**
- `drivers: Driver[]` - Available drivers
- `selectedDriver: string` - Currently selected driver ID
- `onDriverSelect: (id) => void` - Selection callback
- `disabled: boolean` - Disable selector

**Features:**
- Shows driver ID and IP (or "offline")
- Disables offline drivers in dropdown
- Warning alert when no drivers connected

---

## Firmware Components

### SerialPortSelector

**File:** [serial-port-selector.tsx](serial-port-selector.tsx)

**Purpose:** Web Serial API port selector for USB firmware flashing.

**Props:**
- `disabled: boolean` - Disable selector
- `onPortSelect: (getPort) => void` - Callback with port getter function
- `onLog: (message) => void` - Log callback
- `onError: (error) => void` - Error callback

**Features:**
- Scans for previously granted ports on dropdown open
- Requests new port access via browser dialog if none available
- Recognizes common USB-to-serial chips (CP2102, CH340, FTDI, Espressif)
- Handles port cleanup (close/release locks) before returning

---

### FlashResultDialog

**File:** [flash-result-dialog.tsx](flash-result-dialog.tsx)

**Purpose:** Modal dialog showing firmware flash result (success or failure).

**Props:**
- `open: boolean` - Dialog visibility
- `success: boolean` - Whether flash succeeded
- `message: string` - Result message
- `onClose: () => void` - Close callback

---

### ConfirmFlashDialog

**File:** [confirm-flash-dialog.tsx](confirm-flash-dialog.tsx)

**Purpose:** Confirmation dialog before starting USB firmware flash.

**Props:**
- `open: boolean` - Dialog visibility
- `onConfirm: () => void` - Confirm callback
- `onCancel: () => void` - Cancel callback

**Features:**
- Warns about 1-2 minute duration
- Warns not to disconnect or close app
- Warning about potential bricking

---

## Form Components

### NumberField

**File:** [number-field.tsx](number-field.tsx)

**Purpose:** Number input field for react-hook-form with proper clearing support.

**Props:**
- `name: TName` - Form field path
- `control: Control` - react-hook-form control
- `label: string` - Field label
- `helperText?: string` - Helper text
- `min?: number` - Minimum value
- `max?: number` - Maximum value
- `allowFloat?: boolean` - Allow decimal values

**Features:**
- Uses text input type to allow empty field (browser number inputs don't allow clearing)
- Converts to number on change, null when empty
- Integrates with react-hook-form Controller

---

## UI Components

### ThemeToggle

**File:** [theme-toggle.tsx](theme-toggle.tsx)

**Purpose:** Theme mode switcher (light/dark/system).

**Features:**
- Icon button opens menu with three options
- Uses MUI's `useColorScheme` hook
- Icon changes based on current mode

---

### NotificationStack

**File:** [notification-stack.tsx](notification-stack.tsx)

**Purpose:** Renders stacked toast notifications.

**Features:**
- Auto-dismiss after configurable duration
- Stacked vertically from bottom-left
- Clickable notifications link to driver detail page (if driverId present)
- Uses NotificationStore for state
