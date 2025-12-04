# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- ESP32 native unit tests failing in CI due to missing include paths for subdirectories (graphics, effects, utils)

### Added
- ESP32 native tests to pre-commit hook to catch test failures before pushing

### Changed
- Updated CLAUDE.md with comprehensive project overview describing the three main projects (mame, rgfx-hub, esp32)
- Added Key Applications section and Change Logs section to CLAUDE.md
- Fixed typos in CLAUDE.md: "added a the" -> "added to the", "matricies" -> "matrices", "commited" -> "committed", "No not" -> "Do not", "shoud" -> "should"
- Added rgfx-hub-developer agent configuration
