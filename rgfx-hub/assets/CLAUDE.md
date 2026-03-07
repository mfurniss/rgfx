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
- `mame.lua` - MAME/emu type stubs for Lua language server (callback name params are optional)
- `rom_map.json` - Variant-only mapping (JSON); framework auto-loads `{romname}_rgfx` by convention, rom_map only needed for clones/variants whose name differs from the interceptor base name. Read by MAME Lua via inline `parse_json_map()` (MAME's json plugin isn't accessible from autoboot scripts) and hub TypeScript via `JSON.parse()`
- `games/` - Game-specific interceptor scripts (e.g., Pac-Man, Galaga, Galaga 88)
  - Galaga 88 uses C117 address mapper for RAM access; fire detection reads shot counter at 0x3000C3 (work RAM). SCORE_LUT maps point values to kill qualifiers (don-attack, boss, hiyoko, etc.)

### mame/
MAME event handling utilities:
- `rgfx.lua` - Main RGFX bootstrap, registers prestart and frame callbacks to load interceptors. Emits `rgfx/reset` before loading to clear all driver effects, then delays `{game}/init` by ~500ms (30 frames) so MQTT clears reach drivers first. Init payload is the MAME system description (e.g., "Pac-Man (Midway)") for display in the world record scroll text. Uses a boolean guard (`init_sent`) to ensure init fires exactly once. Screen info is printed after 10 frames via `register_frame_done` callback to ensure screen properties are initialized. Note: MAME shutdown detection is handled by `scripts/launch-mame.sh` (not Lua) because `emu.add_machine_stop_notifier` is unreliable.
- `event.lua` - Event emission and logging utilities; writes to `interceptor-events.log`; defines `_G.boot_delay(seconds)` to suppress all events except `/init` during boot. All interceptors call `_G.boot_delay()` before `require("ram")` to avoid emitting events during power-on tests.
- `ram.lua` - RAM monitoring and memory read helpers
- `docs/` - Documentation for MAME integration

### transformers/
JavaScript modules that transform game events into LED effects. Hot-reloaded by `TransformerEngine` — changes to shared modules (global.js, palettes.js) trigger a full reload of all loaded transformers with dependency cache-busting:
- `default.js` - Default transformer for unmapped events
- `global.js` - Cross-game shared constants (driver IDs, named drivers, ambilight config)
- `properties/` - Reusable property helper functions
- `palettes.js` - Color palette definitions (retro game palettes, gradients)
- `games/` - Game-specific transformer modules (defender.js, galaga.js, galaga88.js, outrun.js, pacman.js, robotron.js, shangon.js, smb.js, ssf2.js, starwars.js, etc.)
  - defender.js uses EXPLOSION_DRIVERS (all matrices + front strip) for enemy kill and player death effects so explosions fire on both matrices and the front LED strip.
  - galaga88.js and smb.js use `throttleLatest()` (100ms) for score broadcasts — fires immediately during normal play, consolidates rapid bursts during bonus/end-of-level phases. smb.js passes player qualifier (p1/p2) through throttle for per-player accent colors and includes underwater bubble effects for the swimming music track. `particleWarp()` in galaga88.js uses a local `update()` helper to build fresh event objects each broadcast, rounding density/size to integers for driver validation. Unrecognized enemy types fall back to default color (#409040) silently.
  - smb.js mario-fireball broadcasts dual projectiles on both strips — a bright orange core and a softer trailing glow — for a richer fireball effect.
  - robotron.js uses exclusive() wrapper for human-programming flash effect to cancel overlapping async loops. Entity events (spawn/destroy) are handled under proper entity subject with qualifier routing rather than sfx subject. Tracks cumulative score via `lastScore` and displays score delta text on secondary matrices when delta exactly matches 500, 1000, 1500, or 2000.
  - pacman.js init handler returns false to allow cascade to subject init handler (world record display); ripple effects omit endX/endY when not needed (empty strings fail validation)
  - starwars.js uses randomDrivers() (pick 3 from ALL_DRIVERS) to spread explosions across random drivers instead of only matrices. Laser fire blocked during game states 14 and 87. Particle_field density capped at 100 (max allowed by driver validation)
- `rgfx.d.ts` - TypeScript declarations for IntelliSense in transformer files. Always overwritten on install (system file, not user-editable). Excluded from `sync-assets.sh` since it originates in the repo, not `~/.rgfx/`.
- `eslint.config.js` - ESLint flat config for transformer JS files (defines globals: setTimeout, Promise)
- `.prettierrc` - Prettier configuration for transformer JavaScript files
- `patterns/` - Reusable effect pattern definitions
- `subjects/` - Subject definitions for effect targeting
  - `init.js` - Game init subject (clears effects, displays world record using MAME system description from init payload)
  - `ambilight.js` - Ambilight effect subject
  - `audio.js` - Audio-reactive effect subject
  - `enemy.js` - Enemy subject stub (disabled, game transformers handle enemy events)
  - `player.js` - Player subject stub (disabled, game transformers handle player events)
- `bitmaps/` - Sprite bitmaps for bitmap effects. JSON sprites are extracted from ROM at runtime by `sprite-extract.lua` and written to `~/.rgfx/transformers/bitmaps/`. These generated files are excluded from `sync-assets.sh` and should NOT be committed to the repo. Changes to `.json` files in this directory trigger hot-reload of all transformers via `TransformerEngine`.

### led-hardware/
LED hardware definition files (JSON):
- Define physical LED products with description, SKU, layout, pixel count, chipset
- Includes RGBW LED support (btf-ws2814-rgbw-cob-14px.json, sk6812-rgbw-5v-300px.json)
- Includes virtual hardware definitions for simulator (virtual-strip.json, virtual-wide-matrix.json)

### Build Packaging

Assets are bundled by `forge.config.js` via `extraResource`. The `generateAssets` hook skips the docs build on Windows and in CI environments. The macOS build is unsigned (no Apple Developer certificate) — `entitlements.mac.plist` exists at the hub root for future use if signing is added.
