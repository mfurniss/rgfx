# Assets

This folder contains static assets bundled with the RGFX Hub application. These files are packaged into the Electron app at build time and accessed at runtime.

## CRITICAL - Do NOT edit files here directly!

**Interceptors and transformers are installed to `~/.rgfx/` on first run.**

When creating or modifying interceptors/transformers:
1. **Interceptors**: Edit files in `~/.rgfx/interceptors/`, NOT here
2. **Transformers**: Edit files in `~/.rgfx/transformers/`, NOT here

Files in this `assets/` folder are only copied to `~/.rgfx/` if they don't already exist. Editing here will NOT affect the running application until the user deletes their local copy.

## Subfolders

### esp32/firmware/
ESP32 driver firmware binaries for flashing via USB or OTA:
- `bootloader.bin` - ESP32 bootloader
- `partitions.bin` - Partition table
- `firmware.bin` - Main driver firmware (symlink to versioned binary)
- `manifest.json` - Firmware manifest with file checksums for USB flashing
- `version.json` - Current firmware version metadata

### icons/
Application icons in various formats and sizes:
- `icon.icns` - macOS application icon
- `icon.ico` - Windows application icon
- `icons/` - PNG icons at various resolutions (16x16 to 1024x1024)
- `source/` - Source files for icon generation

### interceptors/
MAME Lua scripts that intercept game state and emit events:
- `mame.lua` - Main entry point, loaded by MAME's plugin system
- `rom_map.lua` - Maps ROM names to game-specific interceptor scripts
- `games/` - Game-specific interceptor scripts (e.g., Pac-Man, Galaga)

### mame/
MAME event handling utilities:
- `rgfx.lua` - Main RGFX module for MAME integration
- `event.lua` - Event emission and logging utilities
- `ram.lua` - RAM monitoring and memory read helpers
- `docs/` - Documentation for MAME integration

### transformers/
JavaScript modules that transform game events into LED effects:
- `default.js` - Default transformer for unmapped events
- `utils.js` - Shared utility functions
- `games/` - Game-specific transformer modules
- `patterns/` - Reusable effect pattern definitions
- `subjects/` - Subject definitions for effect targeting
