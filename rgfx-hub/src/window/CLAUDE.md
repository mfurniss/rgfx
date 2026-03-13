# Window Management

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains the Electron window management system.

## Files

### window-manager.ts

Manages the main application window lifecycle:

- Creates BrowserWindow with appropriate settings
- Handles window events (close, focus, blur)
- Manages devtools in development mode
- Sets up preload script for IPC bridge
- Handles window bounds persistence
- Uses `autoHideMenuBar: true` to hide the menu bar by default (visible with Alt key on Windows)
- Provides `sendSystemStatus()` for broadcasting system status to renderer; uses `systemMonitor.getFullStatus()` for status assembly
- Note: electron-trpc `createIPCHandler` was removed — all IPC is handled by the contract-based system in `src/ipc/`

### index.ts

Re-exports WindowManager for clean imports.

<\!-- No per-file license headers — see root LICENSE -->
