# Renderer Components

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

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

### SystemErrors

**File:** [system/system-errors.tsx](system/system-errors.tsx)

**Purpose:** Sortable table displaying system errors on the System Status page.

**Features:**
- Columns: Time, Error Type, Message
- Renders optional `filePath` and `details` fields below the message when present
- Details rendered as `<pre>` for stack trace readability
- Shows success alert when no errors

---

### SystemStatus

**File:** [system-status.tsx](system-status.tsx)

**Purpose:** Dashboard panel showing overall hub system status.

**Features:**
- Displays: Version, IP Address, Uptime, MQTT Broker, Discovery, Event Reader, Drivers Connected, Events Processed
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
- Sections: LED Hardware (filename derived from hardwareRef), LED Configuration, Driver Status, Driver Hardware, Driver Telemetry
- Live uptime calculation based on driver's reported uptime
- Test LED, Reset, Restart, Disable, and Delete buttons
- Alert shown when LED configuration is missing
- Uses `driver-card-rows.ts` utilities for data row building

---

### driver-card-rows.ts

**File:** [driver-card-rows.ts](driver-card-rows.ts)

**Purpose:** Utility functions for building display rows in DriverCard.

**Functions:**
- `getRotatedDimensions(rotation, width, height)` - Calculate actual dimensions based on rotation code
- `buildTelemetryRows(params)` - Build telemetry section rows (FPS, uptime, last seen)
- `buildHardwareRows(params)` - Build hardware section rows (chip model, cores, heap, etc.)
- `buildLedHardwareRows(params)` - Build LED hardware info rows (filename, layout, count)
- `buildLedConfigRows(params)` - Build LED configuration rows (pin, offset, brightness, rotation, etc.)
- `buildDriverStatusRows(params)` - Build driver status rows (ID, MAC, IP, hostname, etc.)

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
- 5-second timeout auto-clears pending state if driver doesn't respond

---

### ResetDriverButton

**File:** [reset-driver-button.tsx](reset-driver-button.tsx)

**Purpose:** Button to factory reset a driver with confirmation dialog.

**Props:**
- `driver: Driver` - The driver to reset

**Features:**
- Uses `ConfirmActionButton` for confirmation flow
- Warning tooltip explaining reset consequences
- Confirmation dialog listing what will be erased (ID, LED config, WiFi)
- Sends reset command via MQTT
- Disabled when driver is not connected

---

### DriverState

**File:** [driver-state.tsx](driver-state.tsx)

**Purpose:** Displays driver connection state as a chip with optional update warning indicator.

**Props:**
- `driver: Driver` - The driver to display state for
- `firmwareVersions?: Record<string, string>` - Per-chip firmware versions from system status

**Features:**
- Connected: green chip, Disconnected: red chip
- Disabled: grey chip (takes precedence over connection state)
- Orange warning icon when firmware update available (chip-aware version comparison)
- Orange warning icon when LED hardware not configured
- Red warning icon when `telemetry.ledHealthy === false` (RMT output failure)
- Uses `mapChipNameToVariant()` to match driver's chip model to correct target version
- Clicking firmware warning navigates to firmware page; clicking config warning navigates to driver config

---

### TargetDriversPicker

**File:** [target-drivers-picker.tsx](target-drivers-picker.tsx)

**Purpose:** Dropdown popover for selecting which drivers to target for firmware flashing or effects.

**Props:**
- `drivers: Driver[]` - Available drivers
- `selectedDrivers: Set<string>` - Currently selected driver IDs
- `selectAll: boolean` - Whether "select all" is checked
- `onDriverToggle: (driverId) => void` - Toggle callback
- `onSelectAll: () => void` - Select all callback
- `disabled?: boolean` - Disable the picker (e.g., during flash)

**Features:**
- Popover with checkbox list
- "All Drivers" option with indeterminate state
- Shows driver IP or "disconnected"
- Displays chip model badge (e.g., "ESP32-S3") from telemetry when available
- Disables offline drivers
- Alphabetically sorted driver list

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
- `flashMethod: FlashMethod | null` - The method used ('usb' or 'ota')
- `onClose: () => void` - Close callback

**Features:**
- Shows context-appropriate help text on failure:
  - OTA failures suggest trying USB serial
  - USB failures suggest checking serial port availability

---

### ConfirmFlashDialog

**File:** [confirm-flash-dialog.tsx](confirm-flash-dialog.tsx)

**Purpose:** Confirmation dialog before starting USB or OTA firmware flash.

**Props:**
- `open: boolean` - Dialog visibility
- `isUsb: boolean` - Whether this is USB flash (shows additional warning)
- `onConfirm: () => void` - Confirm callback
- `onCancel: () => void` - Cancel callback

**Features:**
- Warns about 1-2 minute duration
- Warns not to disconnect or close app
- Warning about potential bricking
- USB-specific note: warns that settings will be erased and WiFi reconfiguration needed

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
- Uses type assertion for `ControllerRenderProps` to handle stricter generic constraints in newer react-hook-form versions

---

### DirectoryPicker

**File:** [common/directory-picker.tsx](common/directory-picker.tsx)

**Purpose:** Reusable directory path input with native folder picker dialog.

**Props:**
- `label: string` - Field label
- `value: string` - Current directory path
- `onChange: (value: string) => void` - Change handler
- `dialogTitle: string` - Title for native folder dialog
- `defaultPath?: string` - Default path for folder dialog
- `error?: string` - Error message to display
- `helperText?: string` - Helper text shown when no error
- `sx?: SxProps<Theme>` - MUI sx styling

**Features:**
- TextField with FolderOpen icon button in end adornment
- Calls `window.rgfx.selectDirectory()` for native folder picker
- Shows error or helperText below field

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

---

### FirmwareUpdateBanner

**File:** [firmware-update-banner.tsx](firmware-update-banner.tsx)

**Purpose:** Warning banner displayed when drivers have outdated firmware.

**Features:**
- Shown when any connected driver has different firmware version than its chip type's target
- Uses chip-aware version comparison via `mapChipNameToVariant()` to match each driver's chip model to the correct target version
- Hidden automatically during OTA flashing operations
- Navigates to firmware page when clicked

---

### NoDriversBanner

**File:** [firmware/no-drivers-banner.tsx](firmware/no-drivers-banner.tsx)

**Purpose:** Banner shown on firmware page when no drivers are connected.

**Features:**
- Guides user to connect a driver before flashing
- Links to documentation

---

### PageBanner

**File:** [common/page-banner.tsx](common/page-banner.tsx)

**Purpose:** Reusable banner component for page-level notifications.

**Props:**
- `severity: 'info' | 'warning' | 'error'` - Banner type
- `message: string` - Banner text
- `action?: ReactNode` - Optional action button

---

### ConfirmActionButton

**File:** [common/confirm-action-button.tsx](common/confirm-action-button.tsx)

**Purpose:** Reusable button that shows a confirmation dialog before executing an async action.

**Props:**
- `label: string` - Button text
- `dialogTitle: string` - Confirmation dialog title
- `dialogContent: ReactNode` - Dialog body content
- `onConfirm: () => Promise<void>` - Async action to execute on confirm
- `confirmLabel?: string` - Confirm button label (defaults to `label`)
- `pendingLabel?: string` - Label shown during execution (defaults to `label...`)
- `onSuccess?: () => void` - Callback after successful execution
- `onError?: (error: Error) => void` - Error handler (defaults to console.error)
- `size?: ButtonProps['size']` - Button size (defaults to `'medium'` to match SuperButton)
- `variant?: ButtonProps['variant']` - Button variant (defaults to `'outlined'`)
- Plus standard MUI ButtonProps (color, disabled, tooltipTitle, sx)

**Features:**
- Confirmation dialog with customizable content
- Pending state with loading indicator (uses SuperButton internally)
- Error handling with optional callback

---

### SortableTableHead

**File:** [common/sortable-table-head.tsx](common/sortable-table-head.tsx)

**Purpose:** Reusable table header with sortable columns.

**Props:**
- `columns: Column[]` - Column definitions with id, label, sortable flag
- `sortField: string` - Current sort field
- `sortOrder: 'asc' | 'desc'` - Sort direction
- `onSort: (field) => void` - Sort callback

**Features:**
- Sort direction indicators
- Accessible keyboard navigation
- Used by DriverListTable and EventMonitorPage

---

### PageTitle

**File:** [page-title.tsx](page-title.tsx)

**Purpose:** Reusable page header component.

**Props:**
- `icon: React.ReactNode` - Icon to display
- `title: string` - Page title
- `subtitle?: string` - Optional subtitle

---

### PageTransition

**File:** [page-transition.tsx](page-transition.tsx)

**Purpose:** Animated page entrance/exit transitions.

**Features:**
- Uses framer-motion for animations
- Slide up and fade in on enter
- Consistent 200ms animation duration

---

### SuperButton

**File:** [super-button.tsx](super-button.tsx)

**Purpose:** Enhanced button with tooltip support and busy state indicator.

**Props:**
- `children: React.ReactNode` - Button text (required)
- `tooltipTitle?: string` - Optional tooltip text
- `icon?: React.ReactNode` - Optional start icon
- `busyIcon?: React.ReactNode` - Icon shown during busy state (default: CircularProgress)
- `busy?: boolean` - Show busy state with spinner
- `sx?: SxProps<Theme>` - MUI sx styling (merged with defaults)
- Plus all standard MUI ButtonProps (except startIcon, children, sx)

**Features:**
- Wraps MUI Button with optional tooltip
- Busy state disables button and shows spinner
- Span wrapper allows tooltip on disabled buttons
- Prevents text overflow with `whiteSpace: 'nowrap'` and `flexShrink: 0`

---

### GpioPinSelect

**File:** [common/gpio-pin-select.tsx](common/gpio-pin-select.tsx)

**Purpose:** Board-specific GPIO pin selector for ESP32 drivers with safety classifications.

**Props:**
- `name: TName` - Form field path
- `control: Control` - react-hook-form control
- `chipModel?: string` - Chip model from driver telemetry (e.g., "ESP32-D0WD-V3", "ESP32-S3-WROOM-1")

**Features:**
- Self-contained pin definitions for ESP32 and ESP32-S3 variants
- Groups pins into "Safe" and "Use with Caution" sections
- ESP32: excludes flash pins (6-11), input-only pins (34-39); warns about boot strapping pins
- ESP32-S3: excludes USB pins (19-20), PSRAM pins (26-32), non-existent pins (33-39); warns about JTAG pins
- Shows warning alert when current value is an unlisted (unsafe) pin
- Unlisted pins still selectable in dropdown so legacy configs can be saved

---

## Effect Form Components

### EffectForm

**File:** [effect-form/effect-form.tsx](effect-form/effect-form.tsx)

**Purpose:** Dynamic form generator for effect properties based on Zod schemas.

**Props:**
- `schema: z.ZodObject` - Zod schema defining form fields
- `defaultValues: Record<string, unknown>` - Initial form values
- `onChange: (values) => void` - Callback when form values change
- `onValidityChange?: (isValid: boolean) => void` - Callback when form validity changes (gated on `isDirty` to avoid false positives before async validation resolves)
- `fieldTypes?: FieldTypeMap` - Optional field type overrides
- `layoutConfig?: LayoutConfig` - Optional layout configuration

**Features:**
- Introspects Zod schema to generate form fields automatically
- Uses react-hook-form with Zod resolver for validation
- Resets form when schema changes
- Reports form validity to parent via `onValidityChange` (only after user edits)
- Grid layout with responsive columns

### FieldRenderer

**File:** [effect-form/field-renderer.tsx](effect-form/field-renderer.tsx)

**Purpose:** Renders individual form fields based on inferred field metadata.

**Features:**
- Supports text, number, boolean, enum, and color field types
- Integrates with react-hook-form Controller
- Shows validation errors from form state
- Uses `field-utils.ts` for label formatting and tooltips

### CenterField

**File:** [effect-form/fields/center-field.tsx](effect-form/fields/center-field.tsx)

**Purpose:** Input field for center/position coordinates that accept a number (0-100) or the string 'random'.

**Features:**
- Validates input against `z.union([z.literal('random'), z.number()])`
- Emits `undefined` when cleared (not empty string) so optional schema fields validate correctly
- Used for bitmap centerX/centerY/endX/endY and explode centerX/centerY

---

### ColorPicker

**File:** [effect-form/fields/color-picker.tsx](effect-form/fields/color-picker.tsx)

**Purpose:** Inline color picker with text input and native color swatch.

**Features:**
- Native `<input type="color">` swatch for visual picking
- Text input for typing hex or named colors
- Validates color values (hex, CSS named colors, "random")
- Shows "Invalid color" error for unrecognized values
- **Local state optimization:** uses `useState` to avoid propagating every keystroke up the form tree. Only valid colors trigger `onChange` immediately; invalid partial input is held locally and either committed on blur (if valid) or reverted to the last valid value

---

### field-utils.ts

**File:** [effect-form/field-utils.ts](effect-form/field-utils.ts)

**Purpose:** Utility functions for effect form field rendering.

**Functions:**
- `formatLabel(name, overrides?)` - Convert camelCase to human-readable labels with optional overrides
- `formatConstraintHint(min, max)` - Format min/max constraint hints (e.g., "0–100")
- `formatDefaultValue(value)` - Format default values for display (handles numbers, booleans, arrays)
- `buildTooltip(description, defaultValue)` - Combine description and formatted default into tooltip
- `isColorDisabledByGradient(name, values)` - Check if a color field should be disabled due to gradient selection

### BackgroundGradientField

**File:** [effect-form/fields/background-gradient-field.tsx](effect-form/fields/background-gradient-field.tsx)

**Purpose:** Specialized field for background effect gradient configuration.

**Features:**
- Gradient preset selector with preview
- Custom gradient color editing
- Orientation toggle (horizontal/vertical)

### GradientArrayField

**File:** [effect-form/fields/gradient-array-field.tsx](effect-form/fields/gradient-array-field.tsx)

**Purpose:** Editable array field for gradient color stops.

**Features:**
- Add/remove color stops
- Color picker for each stop
- Drag to reorder colors

### PresetSelectorModal

**File:** [effect-form/preset-selector-modal.tsx](effect-form/preset-selector-modal.tsx)

**Purpose:** Modal dialog for selecting effect presets.

**Features:**
- Grid of preset thumbnails
- Search/filter functionality
- Preview on hover

---

## Event Monitor Components

### EventRow

**File:** [event-monitor/event-row.tsx](event-monitor/event-row.tsx)

**Purpose:** Single memoized row in the event monitor table.

**Props:**
- `topic: string` - Event topic name
- `count: number` - Number of times this event has been received
- `lastValue?: string` - Most recent payload value

**Features:**
- Wrapped with `React.memo` — only re-renders when its own props change
- Formats numeric values with hex representation for 16-bit values
- Truncates long string values to 25 characters
- Click triggers `simulateEvent` with the topic and last value

---

## Simulator Components

### SimulatorRow

**File:** [simulator/simulator-row.tsx](simulator/simulator-row.tsx)

**Purpose:** Single row in the event simulator with optimized input handling.

**Props:**
- `index: number` - Row index into the store's `simulatorRows` array

**Features:**
- Subscribes only to its own row slice via Zustand selector (prevents cross-row re-renders)
- Local `useState` for the text input — typing is instant with no store overhead
- Debounced (300ms) sync from local state to Zustand store (and localStorage persist)
- Flushes debounce immediately on Enter key or Trigger button click
- Auto-interval dropdown updates store immediately (no debounce)

---

## Settings Components

### ClearAllEffectsButton

**File:** [common/clear-all-effects-button.tsx](common/clear-all-effects-button.tsx)

**Purpose:** Button to clear all active effects on connected drivers.

**Features:**
- Calls `clearTransformerState` then sends `clear-effects` command to each connected driver
- Disabled when no drivers are connected
- Uses `useShallow` with string ID array selector to avoid re-renders on unrelated driver changes (e.g., telemetry updates)

---

### LogsSection

**File:** [settings/logs-section.tsx](settings/logs-section.tsx)

**Purpose:** Displays log file sizes and provides a clear-all action.

**Features:**
- Shows actual filenames (e.g., `main.log`, `interceptor-events.log`, `{driverId}.log`)
- Full file path shown in tooltip on hover
- Total size summary row
- Clear All Logs button with confirmation dialog

---

### DriverFallbackSection

**File:** [settings/driver-fallback-section.tsx](settings/driver-fallback-section.tsx)

**Purpose:** Toggle for driver fallback mode.

**Features:**
- MUI `Switch` to enable/disable driver fallback
- On toggle: updates Zustand store + syncs to main process via `window.rgfx.setDriverFallbackEnabled()`
- Helper text explaining fallback behavior
- Wrapped in `SettingsSection` with title and subtitle

---

### BackupSection

**File:** [settings/backup-section.tsx](settings/backup-section.tsx)

**Purpose:** One-click backup of the entire `~/.rgfx` configuration directory.

**Features:**
- Creates a zip archive via `window.rgfx.createBackup()` IPC call
- Uses `SuperButton` with busy state during backup
- Three-way result: success → green notify, error → red notify, cancel → no notification
- Wrapped in `SettingsSection` with title and subtitle

<\!-- No per-file license headers — see root LICENSE -->
