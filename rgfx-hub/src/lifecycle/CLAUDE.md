# Application Lifecycle

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder handles Electron application lifecycle events and setup.

## Files

### app-lifecycle.ts

Manages application startup and shutdown:

- Handles app 'ready' event
- Sets up single-instance lock
- Handles 'activate' event (macOS dock click)
- Handles 'window-all-closed' event
- Configures app-level settings
- Calls `setShuttingDown()` on 'before-quit' to suppress socket errors during shutdown

### index.ts

Re-exports lifecycle functions for clean imports.

<\!-- No per-file license headers — see root LICENSE -->
