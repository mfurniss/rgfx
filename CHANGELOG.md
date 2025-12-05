# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Renamed "mappings" to "transformers" throughout the Hub codebase
  - Moved example transformers from `config/mappings/` to `assets/transformers/`
  - Renamed `MappingEngine` → `TransformerEngine`, `MappingContext` → `TransformerContext`, etc.
  - Transformers are now copied to user config folder (`~/.rgfx/transformers/`) on startup
  - User-edited transformers are never overwritten (preserves customizations)
  - Hot-reload still supported for real-time transformer development
- Moved MAME Lua interceptors from `mame/` project into Hub
  - System modules (`rgfx.lua`, `event.lua`, `ram.lua`) now in `rgfx-hub/public/mame/`
  - User-editable interceptors (`rom_map.lua`, game scripts) now in `rgfx-hub/assets/interceptors/`
  - Interceptors copied to `~/.rgfx/interceptors/` on startup (user customizations preserved)
  - Updated `rgfx.lua` to load system modules from bundle, user files from config directory
  - Added `launch-mame.sh` script to `rgfx-hub/scripts/` for launching MAME with RGFX support
  - Removed `mame/` project from workspace (no longer needed)

### Added
- Unified multi-panel LED matrix support - combine multiple identical LED matrices into a single logical display
  - New `unified` property in `ledConfig` accepts a 2D array describing panel layout and wiring order
  - Example: `"unified": [[0, 1], [3, 2]]` creates a 2x2 grid with snake wiring
  - Hub computes effective dimensions and sends to ESP32 driver
  - ESP32 builds unified coordinate map for seamless rendering across panels
- Robotron: 2084 MAME Lua interceptor (`mame/lua/interceptors/robotron_rgfx.lua`)
- Robotron: 2084 hub mapper (`rgfx-hub/config/mappings/games/robotron.js`)
- Robotron ROM mapping in `rom_map.lua`
- Robotron technical documentation including sound system notes (`mame/lua/interceptors/robotron.md`)
- Sean Riddle's Robotron disassembly for reference (`mame/lua/interceptors/robomame.asm`)

### Changed
- Refactored ESP32 effects to use shared canvas architecture
  - Single canvas owned by EffectProcessor reduces memory from ~160KB to ~32KB
  - Effects receive Canvas& reference via constructor instead of owning their own
  - EffectProcessor clears canvas once per frame before rendering
  - Removed `getCanvas()` from IEffect interface
- Simplified Canvas from RGBA (32-bit) to RGB (24-bit) storage
  - 25% memory reduction in canvas storage (e.g., 32x32 canvas: 4KB → 3KB)
  - Alpha is now used only during blend operations via CRGBA input struct
  - New API: `drawPixel(x, y, CRGB)` for direct writes, `drawPixel(x, y, CRGBA, BlendMode)` for blending
  - BlendMode supports REPLACE, ALPHA, ADDITIVE, and AVERAGE modes
- Removed arbitrary MAX_LEDS_PER_PIN limit (300) - memory allocation is the real constraint

### Fixed
- ESP32 native unit tests failing in CI due to missing include paths for subdirectories (graphics, effects, utils)
- Hub renderer crash when importing constants.ts - moved CONFIG_DIRECTORY to paths.ts (Node.js-only)

### Added
- ESP32 native tests to pre-commit hook to catch test failures before pushing

### Changed
- Updated CLAUDE.md with comprehensive project overview describing the three main projects (mame, rgfx-hub, esp32)
- Added Key Applications section and Change Logs section to CLAUDE.md
- Fixed typos in CLAUDE.md: "added a the" -> "added to the", "matricies" -> "matrices", "commited" -> "committed", "No not" -> "Do not", "shoud" -> "should"
- Added rgfx-hub-developer agent configuration
