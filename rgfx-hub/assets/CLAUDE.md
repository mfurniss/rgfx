# Assets

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

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
- `rgfx.lua` - Main RGFX bootstrap, registers prestart and frame callbacks to load interceptors. Note: MAME shutdown detection is handled by `scripts/launch-mame.sh` (not Lua) because `emu.add_machine_stop_notifier` is unreliable.
- `event.lua` - Event emission and logging utilities
- `ram.lua` - RAM monitoring and memory read helpers
- `docs/` - Documentation for MAME integration

### transformers/
JavaScript modules that transform game events into LED effects:
- `default.js` - Default transformer for unmapped events
- `global.js` - Cross-game global effects
- `utils.js` - Shared utility functions
- `palettes.js` - Color palette definitions (retro game palettes, gradients)
- `games/` - Game-specific transformer modules (galaga.js, pacman.js, smb.js, etc.)
- `patterns/` - Reusable effect pattern definitions
- `subjects/` - Subject definitions for effect targeting
  - `ambilight.js` - Ambilight effect subject
  - `audio.js` - Audio-reactive effect subject
- `bitmaps/` - Sprite bitmaps for bitmap effects
  - Pac-Man bonus fruit sprites (pac-bonus-*.gif)
  - Mario coin sprite (mario-coin.gif)
  - `pacman-sprites.js` - Pac-Man sprite definitions

### led-hardware/
LED hardware definition files (JSON):
- Define physical LED products with name, SKU, layout, pixel count, chipset
- Includes RGBW LED support (btf-ws2814-rgbw-cob-14px.json)
