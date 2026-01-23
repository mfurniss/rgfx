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
