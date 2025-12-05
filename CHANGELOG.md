# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

### Fixed
- ESP32 native unit tests failing in CI due to missing include paths for subdirectories (graphics, effects, utils)

### Added
- ESP32 native tests to pre-commit hook to catch test failures before pushing

### Changed
- Updated CLAUDE.md with comprehensive project overview describing the three main projects (mame, rgfx-hub, esp32)
- Added Key Applications section and Change Logs section to CLAUDE.md
- Fixed typos in CLAUDE.md: "added a the" -> "added to the", "matricies" -> "matrices", "commited" -> "committed", "No not" -> "Do not", "shoud" -> "should"
- Added rgfx-hub-developer agent configuration
