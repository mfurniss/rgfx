# Renderer Hooks

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Custom React hooks for the renderer process.

## Hooks

### useFlashState

**File:** [use-flash-state.ts](use-flash-state.ts)

Manages flash operation state for both USB and OTA flashing:
- Tracks progress, logs, errors, and driver flash status
- Provides result modal state with flash method tracking ('usb' | 'ota')
- Actions: setProgress, addLog, clearLogs, setError, showResult, closeResult, resetForNewFlash
- Re-exports `FlashMethod` type from ui-store

### useSimulatorAutoTrigger

**File:** [use-simulator-auto-trigger.ts](use-simulator-auto-trigger.ts)

Handles auto-triggering of simulated events:
- Manages interval timers for each simulator row
- Triggers events automatically at configured intervals
- Cleans up timers on unmount

### useSortableTable

**File:** [use-sortable-table.ts](use-sortable-table.ts)

Generic hook for sortable table functionality:
- Manages sort field and direction state
- Provides sorted data array
- Supports custom sort comparators
- Used by DriverListTable and EventMonitorPage

### useAsyncAction

**File:** [use-async-action.ts](use-async-action.ts)

Manages async action state with pending indicator:
- Returns `{ pending, execute }` where execute wraps the action
- Tracks pending state (false → true → false)
- Handles errors via callback or console.error fallback
- Used by `ConfirmActionButton` and driver action buttons

### useWifiConfigDialog

**File:** [use-wifi-config-dialog.ts](use-wifi-config-dialog.ts)

Manages WiFi configuration dialog state:
- `isOpen`, `isSending`, `error` state
- `lastWifiSsid`, `lastWifiPassword` persisted via UiStore
- `openDialog()`, `closeDialog()`, `setError()`, `setIsSending()`
- `saveCredentials(ssid, password)` persists to localStorage
- Prevents close while sending

### useOtaFlashEvents

**File:** [use-ota-flash-events.ts](use-ota-flash-events.ts)

Subscribes to OTA flash progress events from main process:
- Listens for `ota-flash:state`, `ota-flash:progress`, `ota-flash:error` events
- Updates driver flash status map via callback
- Auto-cleans up subscriptions on unmount
- Used by FirmwarePage for real-time OTA progress tracking

<\!-- No per-file license headers — see root LICENSE -->
