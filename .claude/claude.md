# RGFX - Retro Game Effects

A MAME Lua scripting framework for monitoring retro arcade game state and publishing events via MQTT.

## System Architecture

**CRITICAL - READ ARCHITECTURE FIRST:**

For comprehensive understanding of the RGFX system design, consult [docs/architecture.md](../docs/architecture.md). This document covers:

- Multi-device distributed architecture (Hub + Drivers)
- Communication protocols (MQTT QoS 2, UDP, mDNS)
- LED device configuration and event mapping system
- Implementation priorities and roadmap
- Technology stack and hardware requirements

**When starting new conversations or planning features, always reference architecture.md first.**

## Development Environment

**Platform:** macOS only - all development is done on Mac. Use Mac-specific commands and shortcuts (Cmd instead of Ctrl, etc.)

**CRITICAL - MAME on macOS:**
- **ALWAYS launch MAME in windowed mode** using `-window` flag
- **NEVER use fullscreen mode** - there is a bug that can crash MAME on macOS
- The `launch.sh` script already includes `-window -nomaximize` flags

**CRITICAL - Testing MAME with Claude:**
- **NEVER try to capture MAME output with background processes, timeouts, or redirects** - buffering causes output to be lost
- **ALWAYS ask the user to run the command and paste the console output** rather than trying to automate it
- The user can see the output correctly; trust their reports
- Do NOT use `./mame ... > /tmp/file.txt &` patterns - they don't work

## Documentation - READ FIRST

**CRITICAL - START EVERY NEW CHAT SESSION BY REVIEWING LOCAL DOCS:**

Before starting ANY new conversation or implementing features, ALWAYS review what local documentation is available in the `docs/` directory. This project maintains comprehensive local documentation for all major libraries and APIs.

**Why This Matters:**
- Prevents unnecessary web searches for information we already have
- Ensures consistency with project-specific configurations
- Saves time and avoids outdated information from the web
- Documentation is curated and authoritative

**What to Do:**
1. Check the "Documentation" section below for the complete list of available local docs
2. ALWAYS check local docs BEFORE using WebSearch or WebFetch
3. Only search the web if local docs are insufficient or for very recent changes

---

## Terminology

**CRITICAL - ALWAYS USE CORRECT TERMS:**

- **Hub** - The main Electron app (`rgfx-hub/`) that runs on your computer. This is the central controller that monitors game events and orchestrates the system.
- **Driver** - The ESP32 firmware (`esp32/`) that runs on physical hardware. Each ESP32 device is a "Driver" that controls LED hardware.

**NEVER use "device" as a generic term** - this is too ambiguous. Always be specific:
- Use **"Hub"** when referring to the main application
- Use **"Driver"** when referring to ESP32 units
- Use **"LED device"** when referring to physical LED strips/matrices

**Code naming conventions:**
- TypeScript types: `Driver`, `DriverSystemInfo`, `DriverStats`
- Variables: `driver`, `drivers`, `driverRegistry`
- Functions: `onDriverConnected`, `registerDriver`, `driversConnected`
- IPC channels: `driver:connected`, `driver:disconnected`
- Components: `DriverCard`, `DriverList`

## File Naming Conventions

**CRITICAL - ALWAYS FOLLOW THESE STANDARDS:**

Each sub-project follows its ecosystem's file naming conventions. **Consistency within each project is mandatory.**

### rgfx-hub/ (TypeScript/React/Electron)

**Standard: kebab-case for all files**

- **Files**: Use kebab-case (lowercase with hyphens)
  - Examples: `driver-registry.ts`, `event-file-reader.ts`, `game-event-mapper.ts`
  - React components: `driver-card.tsx`, `system-status.tsx`, `info-section.tsx`
  - Test files: `driver-registry.test.ts`, `mqtt.test.ts`
  - Store files: `driver-store.ts`
  - Type definitions: `driver-config.ts`

- **Code naming** (inside files):
  - Variables/functions: `camelCase` (e.g., `driverRegistry`, `registerDriver`)
  - Classes/interfaces/types: `PascalCase` (e.g., `DriverRegistry`, `DriverConfig`)
  - React components: `PascalCase` (e.g., `DriverCard`, `SystemStatus`) - **required by React**
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_PORT`)

**Rationale:**
- Most popular modern convention for TypeScript/JavaScript projects
- Works well with URLs and case-insensitive file systems
- Clear visual separation from PascalCase component/class names in code
- Consistent with Electron's own documentation and ecosystem

### esp32/ (C++/Arduino/PlatformIO)

**Standard: snake_case for all files** ✅

- Examples: `config_leds.cpp`, `sys_info.h`, `driver_config.cpp`, `mqtt.cpp`
- Already consistent - no changes needed

**Code naming:**
- Variables: `camelCase`
- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### mame/lua/ (Lua)

**Standard: snake_case for all files** ✅

- Examples: `rgfx.lua`, `event.lua`, `pacman_rgfx.lua`
- Already consistent - no changes needed

**Lua Code Formatting and Linting:**
- **Formatter**: StyLua (`brew install stylua`)
  - Config: `mame/lua/.stylua.toml`
  - Run: `cd mame/lua && stylua .`
  - Check: `cd mame/lua && stylua --check .`

- **Linter**: luacheck (`brew install luacheck`)
  - Config: `mame/lua/.luacheckrc`
  - Run: `cd mame/lua && luacheck .`
  - Supports Lua 5.4 including bitwise operators (`>>`, `&`)
  - Version: 1.2.0 from lunarmodules (actively maintained)

**CRITICAL - ALWAYS format and lint Lua files after editing:**
```bash
cd mame/lua && stylua . && luacheck .
```

### Summary

- **rgfx-hub/**: kebab-case (TypeScript/React ecosystem standard)
- **esp32/**: snake_case (C++/Arduino ecosystem standard)
- **mame/lua/**: snake_case (Lua ecosystem convention)

**When creating new files:**
1. Identify which sub-project you're working in
2. Follow that project's file naming convention
3. Ensure code naming (inside files) follows the standards above
4. **Never mix conventions within a single project**

## Code Quality Standards

**CRITICAL - ALWAYS ENFORCE:**

### Research and Documentation

**NEVER GUESS OR ASSUME:**
1. **Research first** - Use WebSearch and WebFetch to find current, authoritative documentation before implementing
2. **Check local docs** - Always check local documentation (see Documentation section below) before web search
3. **Verify recency** - DO NOT use information from the web that is over 2 years old
4. **No assumptions** - If uncertain about API usage, library features, or best practices, RESEARCH or ASK
5. **Best practices** - Follow industry best practices for the technologies in use (TypeScript, React, Electron, etc.)
6. **When stuck** - ASK the senior developer rather than guessing or using outdated approaches

### TypeScript and Lint Errors

**MUST FIX IMMEDIATELY:**
1. **ALWAYS fix TypeScript errors** - Run `npm run typecheck` and fix all errors before completing any task
2. **ALWAYS fix ESLint errors** - Run `npm run lint` and fix all errors/warnings before completing any task
3. **After updating TypeScript files** - ALWAYS run `npm run lint -- --fix` to auto-fix formatting issues
4. **Use npm scripts, not npx** - TypeScript is installed locally, use `npm run typecheck` (efficient) not `npx tsc` (inefficient)
5. **Zero tolerance** - Never leave code in a state with TypeScript or lint errors

### Testing Standards

**MEANINGFUL TESTS ONLY:**
1. **No shallow tests** - Don't just test statically defined input objects for coverage numbers
2. **Test real behavior** - Tests must verify actual functionality, edge cases, and error conditions
3. **Test dynamic scenarios** - Use realistic data, test state changes, async operations, error paths
4. **Quality over coverage** - A few meaningful tests are better than many shallow tests

**Test Checklist:**
- Tests verify actual behavior, not just structure
- Tests include edge cases and error conditions
- Tests use realistic, dynamic data (not just static mocks)
- Tests validate state changes and side effects
- Integration tests verify component interactions

**FORBIDDEN TEST PRACTICES:**
1. **NO HACKS** - Never use hacks or workarounds to make tests pass
2. **NO API MODIFICATION** - Never overload or modify native browser/Node.js APIs to fix tests
3. **NO APP CODE CHANGES** - Never modify application code just to make tests pass
4. **NO SKIPPING TESTS** - Never use `.skip()`, `xit()`, or comment out tests to hide failures
5. **WE ARE NOT DOING TDD** - Tests follow implementation, not the other way around
6. **If a test is hard to write** - The test approach is wrong, not the code. Rethink the test strategy.

### Code Style and Architecture

**CLEAN, EFFICIENT, READABLE:**
1. **Optimized but readable** - Write performant code that is still easy to understand
2. **Add comments where necessary** - Explain complex logic, business rules, and non-obvious decisions
3. **Modular design** - Break code into small, single-responsibility functions and classes
4. **Technology agnostic** - Write loosely coupled code that doesn't over-depend on specific frameworks
5. **NO spaghetti code** - Avoid tangled, hard-to-follow logic with excessive coupling
6. **NO Rube Goldberg machines** - Avoid overly complex solutions with unnecessary indirection
7. **KISS principle** - Keep it simple and straightforward - the simplest solution that works is best

**Code Organization:**
- Functions should do ONE thing well
- Classes should have clear, focused responsibilities
- Minimize dependencies between modules
- Use clear, descriptive names for functions, variables, and classes
- Avoid deep nesting - extract complex logic into named functions

### Development Dependencies

**ALWAYS use --save-dev for development tools:**
- Testing frameworks (vitest, jest, etc.)
- TypeScript
- Linters and formatters
- Build tools
- Type definitions (@types/*)

**Use regular dependencies ONLY for runtime code**

## Project Overview

RGFX intercepts memory changes in MAME-emulated arcade games and publishes game events (score changes, entity states, power-ups, etc.) via an embedded MQTT broker in the Hub for consumption by LED Drivers and other clients.

## MAME ROMs Location

**Path:** `/Users/matt/Workspace/mame0281-arm64/roms`

You can always check available ROMs with:
```bash
ls /Users/matt/Workspace/mame0281-arm64/roms
```

**Current ROMs:**
- **Arcade**: `pacman.zip`, `mspacman.zip`, `galaga.zip`
- **NES**: `smb.nes` (Super Mario Bros USA), `smw.nes` (Super Mario Bros World edition), `castlevania_3.nes`

## Project Structure

This is a VSCode multi-root workspace with sub-projects:
- **rgfx-hub** - Main Electron application (TypeScript/React)
- **mame** - MAME Lua scripts and configuration
- **esp32** - ESP32 firmware (PlatformIO project)

## Architecture

### MAME Lua Scripts (`mame/lua/`)
- `rgfx.lua` - Main entry point, loads game-specific interceptors
- `event.lua` - Event logging module (writes to temp file)
- `ram.lua` - RAM monitoring utilities
- `interceptors/` - Game-specific event handlers
  - `pacman_rgfx.lua` - Pac-Man events (score, ghosts, power pills)
  - `galaga_rgfx.lua` - Galaga events (score)

### RGFX Hub (`rgfx-hub/`)
- Electron application with embedded Aedes MQTT broker
- Monitors MAME events file via `EventFileReader`
- Publishes events via embedded MQTT broker and UDP
- React + Material UI interface
- Built with Electron Forge + Vite

### ESP32 Drivers (`esp32/`)
- PlatformIO firmware for ESP32 devices
- Controls LED hardware via FastLED
- Receives commands via MQTT and UDP
- mDNS device discovery

## Event Format

Events are written as: `topic value`

Example topics:
- `game` - ROM name
- `player/score/p1` - Player 1 score
- Game-specific event topics defined in interceptor files

## Running

```bash
# Launch game with RGFX
cd mame
./launch.sh pacman

# Start RGFX Hub (in another terminal)
cd rgfx-hub
npm start
```

## Key Files

- `mame/launch.sh` - Launches MAME with rgfx.lua autoboot script
- Event log: `$TMPDIR/rgfx_events.log` (macOS/Linux) or `%TEMP%\rgfx_events.log` (Windows)
- `rgfx-hub/src/main.ts` - Hub main process
- `rgfx-hub/src/mqtt.ts` - Embedded Aedes MQTT broker

## Research and Web Search

**CRITICAL - ALWAYS RESEARCH BEFORE IMPLEMENTING:**

Before implementing ANY solution, especially when adding new features or libraries:

1. **ALWAYS research first** using WebSearch and WebFetch tools
2. **Check if the library/framework has built-in support** for what you need
3. **Look for existing solutions** before writing custom code
4. **Avoid reinventing the wheel** - libraries often have features you don't know about

**DO NOT:**
- Jump straight to implementation without research
- Assume you need to write custom code
- Ask the user for permission to search the web - just do it

This prevents adding unnecessary bloat and complexity to the codebase.

## RGFX Hub UI Technology Stack

**Technology Decision: React + Material UI**

### Current Setup

The `rgfx-hub/` directory contains an Electron app configured with:
- **Electron Forge** with Vite plugin (`@electron-forge/plugin-vite`)
- **TypeScript** for type safety
- **Vite** for fast bundling and hot module reload
- **Aedes** MQTT broker (embedded in the Hub)
- **bonjour-service** for mDNS device discovery
- Backend modules: `main.ts`, `mqtt.ts`, `udp.ts`, `EventFileReader.ts`

### UI Framework: React + Material UI

**Decision:** Use React with Material UI (default theme, no customization needed)

**Rationale:**
- Extensive existing experience with React + Material UI
- No need for custom styling - default Material UI theme is acceptable
- Comprehensive component library perfect for Hub requirements:
  - Data tables for device registry
  - Forms for event mapping editor
  - Log viewer components
  - Configuration dialogs
- Fast development path leveraging existing knowledge

### UI Requirements (from architecture.md)

The Hub UI needs components for:
- Device registry display (list/table with status indicators)
- Event mapping editor (JSON or GUI-based)
- LED device configuration forms
- Test mode controls
- Log viewer with filtering
- Status monitoring and health indicators

Material UI provides all necessary components out of the box.

## ESP32 Development

**CRITICAL - ALWAYS COMPILE AFTER CHANGES:**

When modifying any ESP32 code in the `esp32/` directory:

1. **ALWAYS compile after making changes** using: `pio run --project-dir /Users/matt/Workspace/rgfx/esp32`
2. **Check for compilation errors** and fix them immediately
3. **Never leave code in a non-compiling state**

This ensures code quality and catches errors early in development.

## Documentation

### Local Documentation Protocol

**CRITICAL - ALWAYS CHECK LOCAL DOCS FIRST:**

Before using WebSearch or WebFetch, check if documentation exists locally:

1. **MAME Lua API** - `mame/docs/mame_docs/` (comprehensive EPUB extraction)
2. **arduino-mqtt library** - `docs/arduino-mqtt.md` (256dpi/arduino-mqtt for ESP32)
3. **Aedes MQTT broker** - `docs/aedes.md` (Node.js MQTT broker)
4. **Zustand state management** - `docs/zustand.md` (React state management for Hub UI)
5. **ESP32 Preferences library** - `docs/esp32-preferences.md` (NVS storage for ESP32)

**Documentation lookup priority:**
1. **FIRST**: Read local documentation files
2. **SECOND**: Use WebSearch/WebFetch only if local docs are insufficient
3. **NEVER**: Guess or make assumptions - always verify in documentation

### MAME Documentation Protocol

**CRITICAL - READ THIS SECTION FULLY BEFORE ANSWERING ANY MAME QUESTIONS:**

When asked about MAME (Lua APIs, command-line options, features, configuration, etc.):

1. **NEVER use Grep to search for keywords** - This leads to incomplete understanding
2. **ALWAYS use the Read tool to read the complete relevant documentation files**
3. **READ AND UNDERSTAND the full context** before providing answers
4. **DO NOT guess or make assumptions** - if you haven't read the docs, read them first

The documentation in `mame/docs/mame_docs/` is comprehensive and authoritative. Use it.

### MAME Lua API Reference

The extracted MAME EPUB documentation contains comprehensive API reference:

- `mame/docs/mame_docs/luascript/index.xhtml` - Lua scripting overview and tutorial
- `mame/docs/mame_docs/luascript/ref-core.xhtml` - Core APIs (machine manager, video, sound, UI)
- `mame/docs/mame_docs/luascript/ref-mem.xhtml` - Memory system (address spaces, read/write operations)
- `mame/docs/mame_docs/luascript/ref-devices.xhtml` - Device APIs (enumeration, screens, images)
- `mame/docs/mame_docs/luascript/ref-input.xhtml` - Input system (I/O ports, keyboard)
- `mame/docs/mame_docs/luascript/ref-render.xhtml` - Rendering APIs (overlays, textures)
- `mame/docs/mame_docs/luascript/ref-debugger.xhtml` - Debugger integration (breakpoints, watchpoints)
- `mame/docs/mame_docs/luascript/ref-common.xhtml` - Common types and globals
- `mame/docs/mame_docs/commandline/commandline-all.xhtml` - Complete command-line options reference

The embedded Lua environment is **Lua 5.4** with Sol3 bindings. Key global objects available:
- `emu` - Emulator interface (pause, app_name, app_version, frame callbacks)
- `manager` - Machine manager
- `manager.machine` - Currently running machine (devices, screens, memory spaces)

### MQTT Library Documentation

**arduino-mqtt (ESP32 Driver):**
- Location: `docs/arduino-mqtt.md`
- Library: 256dpi/arduino-mqtt (lwmqtt wrapper)
- Key info: QoS 0/1/2 support, callback signatures, buffer configuration, no persistent packet store

**Aedes (Hub MQTT Broker):**
- Location: `docs/aedes.md`
- Library: moscajs/aedes for Node.js
- Key info: QoS 0/1/2 support, persistence options, event handlers, clustering support
