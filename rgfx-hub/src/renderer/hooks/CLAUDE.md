# Renderer Hooks

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Custom React hooks for the renderer process.

## Hooks

### useFlashState

**File:** [use-flash-state.ts](use-flash-state.ts)

Manages OTA flash state and progress:
- Subscribes to `flash:ota:state` and `flash:ota:progress` IPC events
- Provides flash progress percentage and state
- Cleans up listeners on unmount

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
