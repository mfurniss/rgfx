# RGFX Development Journal

A day-by-day chronicle of the RGFX project development.

---

## October 11, 2025

Initial project setup for RGFX, a MAME Lua scripting framework for monitoring retro arcade game state. The first working proof-of-concept successfully tracked Pac-Man scores in real-time using MAME's Lua API and memory monitoring, validating the core technical approach.

---

## October 12, 2025

Expanded RAM monitoring utilities to be more robust and flexible. Added Galaga support as a second test game to prove the framework's multi-game capability. Restructured the code into an interceptor pattern for easier game-specific logic. Implemented MQTT message publishing for external event consumers and added comprehensive message logging for debugging.

---

## October 13, 2025

Major refactoring focused on memory handling. Updated the RAM monitor to support word and dword reads, critical for correctly reading multi-byte values like scores. Created an MQTT bridge architecture for proper game event routing. Debugged and fixed score calculations with proper BCD (Binary-Coded Decimal) decoding.

---

## October 14, 2025

Implemented Pac-Man ghost state tracking to monitor chase, scatter, and frightened modes, enabling future LED effects that respond to ghost AI behavior. Updated file paths and project structure. Completed comprehensive documentation updates including README improvements and CLAUDE.md development guidelines.

---

## October 15, 2025

Merged the ESP32 firmware project into the repository, transforming RGFX into a multi-component system with both software (MAME Lua + Hub) and hardware (ESP32 drivers) in a unified monorepo. This established the foundation for the distributed architecture where game events drive physical LED hardware.

---

## October 16, 2025

Updated VSCode workspace configuration for the new multi-project structure. Implemented UDP messaging alongside MQTT for low-latency event delivery in time-critical LED updates. Reorganized project folders and began implementing the LED effects system on the ESP32 side with multiple iterations to refine the patterns.

---

## October 18, 2025

Added a comprehensive todo list to track feature development. Moved all MAME-related code into a dedicated `mame/` subfolder to maintain organization as more components were added to the repository.

---

## October 20, 2025

Intensive ESP32 firmware development. Fixed bootloader issues preventing proper flashing. Implemented a complete WiFi configuration portal eliminating hardcoded credentials. Built a web-based LED hardware configuration interface and created an ESP32 web installer with proper manifest files for browser-based flashing. Added comprehensive architecture documentation explaining the distributed Hub+Driver system. Established MPL 2.0 licensing and created the rgfx.io landing page. Started building the Hub application with Electron.

---

## October 21, 2025

Focused on Hub development and driver integration. Implemented Over-The-Air (OTA) firmware updates for ESP32 drivers, eliminating USB cable requirements. Established MQTT communication between Hub and Drivers with system information reporting (chip ID, MAC address, firmware version). Implemented mDNS device discovery for automatic driver detection on the network.

---

## October 24, 2025

Added local documentation for key libraries (MAME Lua API, arduino-mqtt, Aedes MQTT broker) to accelerate development. Improved driver MQTT protocol robustness and implemented driver reconnection logic for handling disconnect/reconnect scenarios. Added network traffic statistics tracking. Achieved a major breakthrough with working Electron packaging, enabling standalone app distribution. Updated Vite configuration, refactored React components, added comprehensive unit tests, and established strict ESLint and TypeScript checking for code quality enforcement.

---

## October 25, 2025

Enforced strict linting and TypeScript checking project-wide. Completed major React refactoring following best practices. Implemented Zustand state management with Redux DevTools integration. Made a critical architectural change moving driver configuration from ESP32 NVS to Hub storage, centralizing config management for easier multi-driver setups. Standardized all files to kebab-case naming convention. Cleaned up unused code and added Super Mario Bros interceptor for NES game support.

---

## October 26, 2025

Optimized UDP message handling for better performance. Implemented game mapping system with Lua formatting using StyLua. Added OLED status display to ESP32 drivers for on-device connection status and IP address visibility. Implemented support for multiple simultaneous drivers. Added C++ linting and formatting using clang-format. Major milestone: implemented complete GitLab CI/CD pipeline with automated testing, protected main branch, and feature branch workflow. Added DMG packaging for macOS distribution, fixed WiFi Access Point timeout issues, and set up automated Git bundle backups to Google Drive for disaster recovery.

---

## October 27, 2025

CI/CD debugging and refinement. Fixed HTML generation issues in the pipeline and disabled problematic html_to_progmem.py pre-script. Fixed GitLab CI YAML syntax errors and ESP.h include path issues causing cross-platform build failures. Completed the automated Git bundle backup system with Google Drive integration. Implemented the complete feature branch CI/CD workflow with proper pre-merge testing. Fixed test:driver job by adding version.h generation and configured PlatformIO to skip hardware tests in CI. Added authorship information and established MPL-2.0 licensing consistently across the codebase.

---

## October 28, 2025

Implemented multi-driver broadcast system for efficient simultaneous event delivery to all drivers. Added startup improvements with connection pulse splash screen effect. Fixed CI cache corruption issues by forcing fresh git clones and removed caching from test jobs after discovering intermittent failures. Discovered and worked around a GitLab CI bug where package-lock.json disappears during pipeline execution, eventually fixing the npm ci issue by regenerating the lock file with npm 10.8.2. Implemented abstracted LED configuration system with NVS persistence on ESP32 side, allowing drivers to store and recall their LED hardware configuration. Documented the critical lint-after-edit workflow.

---

## October 29, 2025

Improved ESP32 PlatformIO configuration for better compilation and performance. Fixed a critical LED buffer disconnection bug and removed problematic build flags causing instability. Added incremental development workflow documentation and ESP32-specific guidelines. Enhanced Galaga support with improved RAM monitoring. Implemented pre-commit hook for automatic code quality enforcement running TypeScript checks, ESLint, and tests before every commit. Added comprehensive event mapping system architecture documentation and updated planning preferences to exclude timelines.

---

## October 30, 2025

Optimized the event mapper system with simplified return patterns and single game mapper architecture. Removed the confusing white flash that occurred when drivers received configuration, providing cleaner visual feedback.

---

## October 31, 2025

Fixed CI pipeline failures related to copy_firmware.py script and Electron Forge configuration. Implemented game initialization event system and source-based mapper loading, enabling dynamic mapper loading based on the active game. Completed major LED hardware refactor with improved coordinate transform system and better mapper integration.

---

## November 1, 2025

Refactored LED coordinate transforms into a separate module for better code organization and reusability. Refactored LED configuration system and added LED test mode for hardware validation. Eliminated fragile setTimeout() calls in favor of proper async/await patterns. Documented async/await best practices, setTimeout pitfalls, and data-driven code guidelines preferring lookup tables over branching logic. Documented MQTT config payload format and LED test mode functionality.

---

## November 2, 2025

Refactored codebase to consolidate global constants and improve the heartbeat mechanism between Hub and Drivers. Fixed CI issues by moving platform-specific dependencies to optionalDependencies, then removing Rollup platform-specific dependency to ensure CI pipeline success.

---

## November 4, 2025

Added variable frame rate limiting to LED rendering for handling different refresh rates based on effect complexity. Created centralized constants file for ESP32 driver firmware to eliminate magic numbers. Refactored serial commands into a modular thread-safe system. Fixed critical ESP32 boot loop caused by corrupted EEPROM configuration with validation and fallback mechanisms. Added sys_info serial command for better debugging capabilities and improved C++ code formatting. Removed unused 'type' field from Driver interface. Implemented PulseEffect class with alpha-based fading and modular architecture as the first proper LED effect. Updated documentation and disabled MAME audio to reduce noise during gameplay. Added IEffect interface for extensibility. Fixed CI issues with package-lock.json workaround and DMG build failures on Linux by skipping DMG creation on non-tag commits.

---

## November 5, 2025

Updated documentation across the project. Added pulse fade control and optimized rendering performance for smoother LED effects.

---

## November 6, 2025

Implemented robust MQTT state synchronization architecture enabling Hub and Drivers to maintain consistent state through disconnections and reconnections. Standardized all logging to use the log() wrapper consistently throughout the codebase. Added optimistic UI updates for the test button to improve perceived responsiveness. Added tooltip to test button explaining the test pattern. Fixed LED test mode and matrix orientation issues ensuring test patterns display correctly on both strip and matrix layouts.

---

## November 7, 2025

Fixed CI cache warning by removing non-existent .platformio/ path from cache configuration.

---

## November 8, 2025

Major refactoring of ESP32 effect system to use data-driven lookup tables, eliminating long if/else chains for better maintainability. Reorganized ESP32 source code into logical directories (effects/, display/, network/, config/) for improved project structure. Modernized C++ include paths and expanded native test coverage. Added native C++ tests to CI pipeline, ensuring both Hub and Driver code quality is maintained through automated testing.

---

## November 9, 2025

Refactored effect rendering architecture by injecting matrix reference at effect construction time rather than passing it at render time, improving performance and API clarity. Implemented dynamic color correction configuration for LED drivers, allowing runtime adjustment of gamma and brightness settings for optimal visual output across different LED hardware types.

---

## November 11, 2025

Implemented SSDP (Simple Service Discovery Protocol) broker discovery, replacing mDNS for more reliable Hub discovery by ESP32 drivers. This change simplifies network configuration and improves connection reliability. Converted LED test mode into a proper effect within the EffectProcessor framework, maintaining consistency with other effects and eliminating special-case handling. Updated driver definitions to support the new discovery mechanism.

---

## November 12, 2025

Merged driver-hardware branch completing the transition to SSDP-based discovery and the refactored effect system architecture.

---

**Total Development Time:** 32 days (October 11 - November 12, 2025)
**Total Commits:** 178
**Major Features Delivered:**
- MAME Lua interceptor framework
- ESP32 firmware with LED control
- Electron Hub application with MQTT broker
- CI/CD pipeline with automated testing including native C++ tests
- Event mapping and LED effect system with data-driven architecture
- Multi-driver support with SSDP discovery (replaced mDNS)
- OTA firmware updates
- LED test mode integrated as proper effect
- Dynamic color correction configuration
- Modular ESP32 source organization
