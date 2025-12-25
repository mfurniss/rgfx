# RGFX Development Journal

A day-by-day chronicle of the RGFX project development.

<!-- CLAUDE NOTE:
When updating journal entries:
- Always review git commits for that day first
- Each day is a high-level executive summary
- Keep entries concise without low-level implementation details
- Focus on major features implemented that day
-->

## October 11, 2025

Initial project setup for RGFX, a MAME Lua scripting framework for monitoring retro arcade game state. The first working proof-of-concept successfully tracked Pac-Man scores in real-time using MAME's Lua API and memory monitoring, validating the core technical approach.

## October 12, 2025

Expanded RAM monitoring utilities to be more robust and flexible. Added Galaga support as a second test game to prove the framework's multi-game capability. Restructured the code into an interceptor pattern for easier game-specific logic. Implemented MQTT message publishing for external event consumers and added comprehensive message logging for debugging.

## October 13, 2025

Major refactoring focused on memory handling. Updated RAM monitor to support word and dword reads for multi-byte values. Created MQTT bridge architecture for game event routing with BCD score decoding.

## October 14, 2025

Implemented Pac-Man ghost state tracking for chase, scatter, and frightened modes. Updated file paths and project structure. Completed documentation updates including README and CLAUDE.md development guidelines.

## October 15, 2025

Merged ESP32 firmware project into repository, establishing unified monorepo with MAME Lua, Hub, and ESP32 drivers for distributed game-to-LED architecture.

## October 16, 2025

Updated VSCode workspace for multi-project structure. Implemented UDP messaging alongside MQTT for low-latency LED updates. Reorganized folders and began LED effects system implementation.

## October 18, 2025

Added a comprehensive todo list to track feature development. Moved all MAME-related code into a dedicated `mame/` subfolder to maintain organization as more components were added to the repository.

## October 20, 2025

Intensive ESP32 firmware development. Fixed bootloader issues preventing proper flashing. Implemented a complete WiFi configuration portal eliminating hardcoded credentials. Built a web-based LED hardware configuration interface and created an ESP32 web installer with proper manifest files for browser-based flashing. Added comprehensive architecture documentation explaining the distributed Hub+Driver system. Established MPL 2.0 licensing and created the rgfx.io landing page. Started building the Hub application with Electron.

## October 21, 2025

Focused on Hub development and driver integration. Implemented Over-The-Air (OTA) firmware updates for ESP32 drivers, eliminating USB cable requirements. Established MQTT communication between Hub and Drivers with system information reporting (chip ID, MAC address, firmware version). Implemented mDNS device discovery for automatic driver detection on the network.

## October 24, 2025

Added local documentation for key libraries (MAME Lua API, arduino-mqtt, Aedes MQTT broker) to accelerate development. Improved driver MQTT protocol robustness and implemented driver reconnection logic for handling disconnect/reconnect scenarios. Added network traffic statistics tracking. Achieved a major breakthrough with working Electron packaging, enabling standalone app distribution. Updated Vite configuration, refactored React components, added comprehensive unit tests, and established strict ESLint and TypeScript checking for code quality enforcement.

## October 25, 2025

Enforced strict linting and TypeScript checking project-wide. Completed major React refactoring following best practices. Implemented Zustand state management with Redux DevTools integration. Made a critical architectural change moving driver configuration from ESP32 NVS to Hub storage, centralizing config management for easier multi-driver setups. Standardized all files to kebab-case naming convention. Cleaned up unused code and added Super Mario Bros interceptor for NES game support.

## October 26, 2025

Optimized UDP message handling for better performance. Implemented game mapping system with Lua formatting using StyLua. Added OLED status display to ESP32 drivers for on-device connection status and IP address visibility. Implemented support for multiple simultaneous drivers. Added C++ linting and formatting using clang-format. Major milestone: implemented complete GitLab CI/CD pipeline with automated testing, protected main branch, and feature branch workflow. Added DMG packaging for macOS distribution, fixed WiFi Access Point timeout issues, and set up automated Git bundle backups to Google Drive for disaster recovery.

## October 27, 2025

CI/CD refinement and debugging. Completed the automated Git bundle backup system with Google Drive integration. Implemented the complete feature branch CI/CD workflow with proper pre-merge testing. Added authorship information and established MPL-2.0 licensing consistently across the codebase.

## October 28, 2025

Implemented multi-driver broadcast system for efficient simultaneous event delivery to all drivers. Added startup improvements with connection pulse splash screen effect. Fixed CI cache corruption issues by forcing fresh git clones and removed caching from test jobs after discovering intermittent failures. Discovered and worked around a GitLab CI bug where package-lock.json disappears during pipeline execution, eventually fixing the npm ci issue by regenerating the lock file with npm 10.8.2. Implemented abstracted LED configuration system with NVS persistence on ESP32 side, allowing drivers to store and recall their LED hardware configuration. Documented the critical lint-after-edit workflow.

## October 29, 2025

Improved ESP32 PlatformIO configuration for better compilation and performance. Fixed a critical LED buffer disconnection bug and removed problematic build flags causing instability. Added incremental development workflow documentation and ESP32-specific guidelines. Enhanced Galaga support with improved RAM monitoring. Implemented pre-commit hook for automatic code quality enforcement running TypeScript checks, ESLint, and tests before every commit. Added comprehensive event mapping system architecture documentation and updated planning preferences to exclude timelines.

## October 30, 2025

Optimized the event mapper system with simplified return patterns and single game mapper architecture. Removed the confusing white flash that occurred when drivers received configuration, providing cleaner visual feedback.

## October 31, 2025

Fixed CI pipeline failures related to copy_firmware.py script and Electron Forge configuration. Implemented game initialization event system and source-based mapper loading, enabling dynamic mapper loading based on the active game. Completed major LED hardware refactor with improved coordinate transform system and better mapper integration.

## November 1, 2025

Refactored LED coordinate transforms into a separate module for better code organization and reusability. Refactored LED configuration system and added LED test mode for hardware validation. Eliminated fragile setTimeout() calls in favor of proper async/await patterns. Documented async/await best practices, setTimeout pitfalls, and data-driven code guidelines preferring lookup tables over branching logic. Documented MQTT config payload format and LED test mode functionality.

## November 2, 2025

Refactored codebase to consolidate global constants and improve the heartbeat mechanism between Hub and Drivers. Fixed CI issues by moving platform-specific dependencies to optionalDependencies, then removing Rollup platform-specific dependency to ensure CI pipeline success.

## November 4, 2025

Added variable frame rate limiting to LED rendering for handling different refresh rates. Created centralized constants file for ESP32 driver firmware. Refactored serial commands into a modular thread-safe system. Fixed critical ESP32 boot loop caused by corrupted EEPROM configuration. Implemented PulseEffect as the first proper LED effect with alpha-based fading.

## November 5, 2025

Updated documentation across the project. Added pulse fade control and optimized rendering performance for smoother LED effects.

## November 6, 2025

Implemented robust MQTT state synchronization architecture enabling Hub and Drivers to maintain consistent state through disconnections and reconnections. Standardized all logging to use the log() wrapper consistently throughout the codebase. Added optimistic UI updates for the test button to improve perceived responsiveness. Added tooltip to test button explaining the test pattern. Fixed LED test mode and matrix orientation issues ensuring test patterns display correctly on both strip and matrix layouts.

## November 8, 2025

Major refactoring of ESP32 effect system to use data-driven lookup tables, eliminating long if/else chains for better maintainability. Reorganized ESP32 source code into logical directories (effects/, display/, network/, config/) for improved project structure. Modernized C++ include paths and expanded native test coverage. Added native C++ tests to CI pipeline, ensuring both Hub and Driver code quality is maintained through automated testing.

## November 9, 2025

Refactored effect rendering architecture by injecting matrix reference at effect construction time rather than passing it at render time, improving performance and API clarity. Implemented dynamic color correction configuration for LED drivers, allowing runtime adjustment of gamma and brightness settings for optimal visual output across different LED hardware types.

## November 11, 2025

Implemented SSDP (Simple Service Discovery Protocol) broker discovery, replacing mDNS for more reliable Hub discovery by ESP32 drivers. This change simplifies network configuration and improves connection reliability. Converted LED test mode into a proper effect within the EffectProcessor framework, maintaining consistency with other effects and eliminating special-case handling. Updated driver definitions to support the new discovery mechanism.

## November 12, 2025

Merged driver-hardware branch completing the transition to SSDP-based discovery and the refactored effect system architecture.

## November 14, 2025

Implemented sequential driver ID system with centralized validation and automatic assignment on first connection. Implemented auto-incrementing firmware version system for automatic build numbering. Added firmware version display to Hub UI and updated factory_reset command to clear both NVS and WiFi credentials.

## November 15, 2025

Centralized Hub constants into single configuration file and enabled prefer-const ESLint rule with Prettier for consistent formatting. Replaced manual time formatting with date-fns library and implemented custom locale for short-format relative times. Fixed file descriptor leak by properly stopping EventFileReader on app quit and updated tests to use temporary directories.

Implemented real-time events counter, Hub uptime display with 1-second refresh, and locale-aware number formatting throughout the UI using toLocaleString(). Simplified event file handling, added Lua file check, and removed RGFX header AppBar moving Hub IP to System Status section.

## November 16, 2025

Implemented comprehensive test improvements for mapping-engine. Improved driver list UX by making entire table rows clickable, disabled WiFi power saving for low-latency UDP, and added LED configuration validation. Implemented graceful shutdown when window close button is clicked.

## November 17, 2025

Fixed critical LED config push bug - Hub wasn't sending LED configurations to drivers on startup. Refactored driver identification and simplified MQTT communication by removing unused type field from driver definitions and payloads. Fixed driver ID sync issues and added comprehensive ESP32 unit tests. Improved UI styling across driver cards and system status components.

## November 18, 2025

Implemented complete Hub UI redesign with screen-based navigation system including sidebar and dedicated screens for Home, Drivers, Events, Mappers, and System. Updated Event Monitor with lastValue tracking, fixed test effect LED compositing bug with proper alpha blending, and simplified TransportLayer API. Implemented dark mode support with automatic system theme detection and manual toggle.

Added Firmware management page with USB flashing support using Web Serial API and esptool-js, plus OTA firmware flashing via esp-ota library. Fixed ESP32 serial command processing issues and factory reset boot loop. Major main.ts refactoring extracted code into modular components with dedicated IPC and MQTT subscription modules.

## November 19-20, 2025

Implemented comprehensive effect testing infrastructure with new Test Effects page featuring manual effect triggering and real-time parameter controls. Optimized Electron renderer performance by migrating driver stats from polling to event-driven IPC updates with automatic telemetry cleanup for disconnected drivers.

Implemented particle-based explosion effect system with FIFO particle pool architecture, configurable parameters, and realistic physics including velocity randomization and gravity simulation. Added configurable window zoom factor (default 90%) and merged hub-firmware-updater branch completing the firmware management system with both USB and OTA flashing capabilities.

## November 21, 2025

Simplified ESP32 MQTT broker discovery with periodic polling. Updated telemetry interval and removed failure tracking, reducing firmware size by 1,456 bytes. Implemented driver disconnection detection with 30-second timeout.

## November 23, 2025

Fixed critical firmware version system bug from previous days affecting PlatformIO builds. Optimized ESP32 UDP processing for lowest latency. Customized Electron's native macOS About menu with RGFX branding.

## November 24, 2025

Implemented LED progress indicator for OTA firmware updates showing orange LED moving across strip/matrix during upload. Enhanced firmware deployment pipeline with automatic manifest.json generation including SHA256 checksums for integrity validation. Improved Hub test suite by consolidating redundant tests.

## November 25, 2025

Implemented bitmap effect system. Added Zod schema validation throughout the codebase for effects, driver persistence, firmware manifests, and MQTT messages. Cleaned up unused exports and improved UI with dark mode window background. Refactored ESP32 codebase by extracting OTA setup and network task into dedicated modules.

## November 26, 2025

Replaced Prettier with ESLint stylistic rules for unified code formatting. Added ESP32 memory safety using malloc/nothrow for safe allocation handling. Implemented remote logging from ESP32 drivers to Hub via MQTT, enabling centralized log viewing. Added toast notifications for driver connect/disconnect events. Fixed pulse effect integer truncation bugs causing backwards movement and blinking. Improved versioning and test effects UI.

Updated Galaga mapper with explode effect and added Prettier for JS mapper files with wildcard driver routing support. Removed -console flag from MAME launch script.

## November 27, 2025

Refactored CLAUDE.md into modular documentation structure with separate files for development workflow, coding standards, ESP32 development, MAME integration, architecture, and broker discovery. Added comprehensive test coverage and standardized @ path aliases throughout the codebase. Converted remaining deep relative imports.

Updated wipe effect to fill/unfill animation pattern and bumped firmware version.

## November 28, 2025

Added driver configuration page with LED hardware settings form. Added Configure Driver button to driver card header with status chip moved next to driver name.

## November 29, 2025

Refactored mqtt module to network directory for clearer naming convention. Cleaned up unused exports throughout the codebase. Added npm script for checking unused exports. Extracted shared effect properties to dedicated directory.

## November 30, 2025

Added Test LEDs button directly to drivers table for quick LED testing without opening configuration. Updated explode effect default parameters. Implemented configurable WiFi TX power setting in driver config, allowing adjustment of ESP32 radio output power via Hub configuration.

## December 1, 2025

Fixed native C++ test compilation issues. Improved CI pipeline by adding auto-cancel for redundant pipelines on new commits and skipping branch pipelines when merge requests exist. Merged multi-pin-output branch.

## December 2, 2025

Implemented effect reset functionality allowing effects to be cleared before adding new instances via a reset flag in the effect schema. Refactored effect schemas to use a shared baseEffect that includes color and reset properties, reducing duplication across bitmap, explode, pulse, and wipe effects. Added open driver log file feature to Hub for easier debugging. Added d3-scale library for mapper value scaling and bitmap centerX/centerY support for positioning effects. Refactored UdpClient to use reusable socket for improved performance. Fixed VSCode Prettier configuration for HTML formatting by updating .prettierignore and user settings.

## December 5, 2025

Consolidated project resource organization by moving `public/` folder contents into `assets/` for consistent Electron extraResource handling. The `public/` naming was a leftover from web conventions with no special meaning in Electron packaging. Updated forge.config.ts, flash-ota-handler, launch-mame.sh, and related tests. Added CLAUDE.md documentation files for the network module (MQTT broker, SSDP/UDP discovery services, network utilities) and schemas module (Zod validation schemas for telemetry, driver persistence, LED hardware, firmware manifests, and effects).

## December 6, 2025

Fixed firmware version sync issue causing Hub to incorrectly report drivers as needing updates. Added SuperButton component for consistent button styling. Created DriverState component showing connection status with update warning icon. Fixed drivers disconnecting during OTA firmware updates. Improved Firmware page UX by making OTA the default flash method and auto-selecting drivers that need updates.

## December 7, 2025

Updated CLAUDE.md documentation files across the codebase. Removed legacy config folder from source tree (configs now stored in ~/.rgfx/). Moved Reset and Open Driver Log buttons from LED Configuration section to header bar for better accessibility.

Added .luarc.json for MAME Lua scripts to configure lua-language-server with MAME-provided globals (emu, manager), suppressing false positive undefined global warnings.

Implemented Games page showing configured games from MAME ROMs directory with three-column sortable table (ROM filename, Interceptor, Transformer). Clickable filenames open files in default OS application. ROM resolution uses rom_map.lua for aliases with fallback to 1-to-1 mapping. Added generic file:open IPC handler and refactored open-driver-log to use shared openFile() function.

## December 8, 2025

Implemented Settings page with appearance and directories sections. Moved theme toggle from sidebar header to dedicated settings page with System/Light/Dark options. Added RGFX config directory input (required, auto-populated with ~/.rgfx default) and MAME ROMs directory input (optional). Both inputs have native OS folder picker buttons using Electron's dialog API. Directory existence validation on save with success/error notifications. Settings persist to localStorage via Zustand.

Standardized terminology from "folder" to "directory" throughout the codebase for consistency. Updated Games page column headers for clarity: ROM → MAME ROM File, Interceptor → MAME Interceptor, Transformer → RGFX Hub Transformer.

## December 9, 2025

Added animated page transitions using Framer Motion for smooth navigation between Hub pages. Created PageTitle component for consistent page headers with clickable license link. Consolidated static app info (version, paths) into a single IPC handler and exposed static paths from preload instead of requiring IPC calls.

Improved test infrastructure significantly. Added ESP32 driver unit tests with PlatformIO native testing environment and mock implementations for FastLED, Arduino, and ArduinoJson. Improved Hub test coverage and quality across multiple modules.

Added and updated CLAUDE.md documentation files throughout the codebase. Refined app layout, removed window title bar for cleaner appearance, and cleaned up page components.

## December 10, 2025

Fixed critical UDP message queue race condition on ESP32 drivers. Rapid-fire effects were being dropped because the single-message buffer was overwritten before processing.

## December 11, 2025

Implemented Hardware Abstraction Layer (HAL) enabling ESP32 effect code to run natively on desktop. The led-sim application now shares effect code with ESP32 drivers, using Raylib for rendering instead of FastLED. Drivers now reboot after saving configuration. Improved disconnect notifications with reason tracking.

## December 12, 2025

Made led-sim window resizable with dynamic LED scaling. Fixed UDP message parsing bug causing effects to display incorrect colors. Added localhost UDP broadcast so led-sim can receive effects from Hub's Effects Playground. Improved LED simulator visuals with smaller round LEDs, glow effect, and better contrast. Created unified check-code script for all projects.

## December 13, 2025

Implemented projectile effect with trail rendering, configurable velocity, friction, and directional movement. Added comprehensive effect tests and runtime optimizations. Added FPS telemetry to driver cards. Implemented text rendering effect. Added clear-effects command to reset effects on game init. Integrated world record high score display from Aurcade.com on game initialization.

## December 14, 2025

Added scroll_text effect for horizontally scrolling text. Added accentColor support to text effects for shadow rendering. Implemented firmware update banner shown when drivers need updates. Improved timing precision with microsecond resolution. Removed 120 FPS cap, switching to variable frame rate (VFR) rendering. Fixed MQTT reconnection failures after WiFi disconnect/reconnect. Fixed periodic MQTT disconnections by increasing keep-alive timeout.

## December 15, 2025

Implemented event bus architecture for decoupled component communication. Fixed MQTT first-connection failures caused by non-reentrant arduino-mqtt library by queuing operations for main loop processing. Added automatic network change detection and recovery.

## December 16, 2025

Reduced effect trigger latency by ~6ms. Improved firmware update UX with spinner during OTA, disabled controls while updating, and state persistence across navigation. Fixed disconnect notifications incorrectly showing on app startup.

## December 17, 2025

Added Star Wars (Atari 1983) interceptor and transformer. Implemented FX Playground state persistence between reloads. Created UnifiedPanelEditor with drag-and-drop panel swapping and click-to-rotate interactions for multi-panel LED matrix configuration.

**Codebase Statistics:**
- ESP32 Driver: 9,242 lines
- RGFX Hub: 31,153 lines
- LED Simulator: 2,219 lines
- MAME Lua Scripts: 3,906 lines
- Transformers: 1,033 lines
- **Total: ~47,553 lines of code**

## December 18, 2025

Implemented plasma effect using Perlin noise with configurable gradients and animation speed. Added per-RGB floor cutoff values to driver configuration, preventing dim red LED bleed at low brightness levels. Fixed critical OTA race condition where effects weren't clearing during firmware updates due to cross-core FastLED access. Optimized rendering with fillBlock4x4() inline method for 4x4 block fills. Fixed effects playground broadcasting to all drivers when none selected. Enhanced driver detail page to display gamma correction, floor cutoff values, and multi-panel layout configuration. Updated firmware terminology from "Flash" to "Update" throughout Hub UI.

## December 19, 2025

Added Galaga 88 interceptor with BCD score reading via C117 memory controller. Implemented event monitor persistence to localStorage with reset functionality and confirmation dialog. Added console output for all MAME events. Set plasma effect defaults to match Rainbow preset. Simplified firmware version system to use content hash only, removing commit count from dev builds.

## December 20, 2025

Implemented MAME shutdown event to stop all effects when MAME quits. Hub now clears effects on all connected drivers during app shutdown. Added test coverage for previously untested modules including network-utils, firmware-version-service, firmware-watcher, and system-monitor. Refactored test mocks using vitest-mock-extended, eliminating ~130 type casts. Created test mock factories to reduce duplication. Added telemetry history charts with animated line graphs for Free Heap, FPS, and RSSI using Recharts library. Implemented ring buffer for 1-hour telemetry retention. Reorganized Hub components into logical subfolders. Added code quality tools: cppcheck, depcheck, license-checker, and AddressSanitizer. Implemented text effect auto-wrapping to next row when exceeding canvas width.

## December 21, 2025

Changed background and plasma effects from boolean enabled flag to string enum supporting fade-in/fade-out states. Refactored Driver from class to plain object with centralized timeout logic. Fixed FX Playground losing settings when switching effects. Changed projectile effect lifespanSpread and powerSpread to percentage semantics for more intuitive configuration. Fixed driver selector "All" checkbox incorrectly showing checked state with no actual selections.

## December 22, 2025

Fixed projectile effect tests by adding proper default values and missing initializers. Removed effect defaults from ESP32 firmware in favor of Hub-side defaults. Added test helper functions for creating effect payloads in native tests. Added Random Trigger button to FX Playground for quick effect testing. Fixed explode effect boundary bug and removed unused scalePower parameter. Implemented automatic explosion velocity scaling based on device dimensions. Split LED Configuration page into separate Hardware and Configuration sections. Added frame timing instrumentation to ESP32 driver and optimized explode effect rendering. Reorganized sidebar navigation with section dividers for better organization. Consolidated configuration constants and expanded LED simulator rows.

## December 23, 2025

Implemented WiFi credential configuration system allowing credentials to be set via USB serial or OTA for multiple drivers. Added events per second chart to system status page showing real-time UDP event rates. Fixed driver DNS hostnames to match configured IDs for proper network identification. Added safeRestart() function to prevent LED corruption during driver restarts. Fixed flaky tests by switching to jsdom environment and improving test isolation. Improved event rate chart to show only UDP events and auto-hide when no data. Added centralized color prop validation to prevent null pointer crashes in effects, then refactored validation to individual effects for better modularity. Added Galaga 88 transformer template and updated documentation. Removed CHANGELOG.md in favor of the development journal.

**Total Development Time:** 75 days (October 11 - December 23, 2025)
**Total Commits:** 632
