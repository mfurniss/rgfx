# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Robotron: 2084 MAME Lua interceptor (`mame/lua/interceptors/robotron_rgfx.lua`)
- Robotron: 2084 hub mapper (`rgfx-hub/config/mappings/games/robotron.js`)
- Robotron ROM mapping in `rom_map.lua`

### Fixed
- ESP32 native unit tests failing in CI due to missing include paths for subdirectories (graphics, effects, utils)

### Added
- ESP32 native tests to pre-commit hook to catch test failures before pushing

### Changed
- Updated CLAUDE.md with comprehensive project overview describing the three main projects (mame, rgfx-hub, esp32)
- Added Key Applications section and Change Logs section to CLAUDE.md
- Fixed typos in CLAUDE.md: "added a the" -> "added to the", "matricies" -> "matrices", "commited" -> "committed", "No not" -> "Do not", "shoud" -> "should"
- Added rgfx-hub-developer agent configuration
