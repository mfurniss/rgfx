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
- Provides `sendSystemStatus()` (synchronous) for broadcasting system status to renderer

### index.ts

Re-exports WindowManager for clean imports.
