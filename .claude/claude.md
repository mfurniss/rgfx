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

**CRITICAL - READ ESLINT CONFIG AT SESSION START:**
- **ALWAYS read and understand** `rgfx-hub/eslint.config.mjs` at the start of each new session
- This ensures familiarity with the project's strict linting rules
- Key points from ESLint config:
  - Uses TypeScript strict type checking (`strictTypeChecked` + `stylisticTypeChecked`)
  - React + React Hooks rules enforced
  - Prefer nullish coalescing (`??`) over logical OR (`||`) for safer operations
  - Test files have relaxed rules (allow `any`, unsafe operations, etc.)
  - All ESLint warnings are treated as errors in CI

**CRITICAL - MAME on macOS:**
- **ALWAYS launch MAME in windowed mode** using `-window` flag
- **NEVER use fullscreen mode** - there is a bug that can crash MAME on macOS
- The `launch.sh` script already includes `-window -nomaximize` flags

**CRITICAL - Testing MAME with Claude:**
- **NEVER try to capture MAME output with background processes, timeouts, or redirects** - buffering causes output to be lost
- **ALWAYS ask the user to run the command and paste the console output** rather than trying to automate it

**CRITICAL - Cleanup Temporary Files:**
- **ALWAYS cleanup temporary files and directories** created during debugging or testing
- Common locations: `/tmp/`, `/private/tmp/`, test clone directories

**CRITICAL - Analyzing User-Provided Logs:**
- **ALWAYS read the ENTIRE log output** when the user pastes logs
- **NEVER make assumptions** based only on the beginning or partial sections of logs
- Look for patterns and events across the **full timeline** of the log
- The beginning of logs may show initialization before the actual events occur
- **NEVER conclude something isn't working** based only on incomplete log analysis

**Automated Backups to Google Drive:**
- **Automatic daily backups** are configured via launchd agent
- **Runs daily at 2:00 AM** - creates Git bundle backup to Google Drive
- **Script location**: `scripts/backup-to-gdrive.js`
- **Backup location**: `~/Google Drive/My Drive/Backups/rgfx/`
- **Retention**: Keeps last 30 daily backups, auto-deletes older ones
- **Manual backup**: Run `node scripts/backup-to-gdrive.js` anytime
- **View logs**: `tail -f ~/Library/Logs/rgfx-backup.log`
- **Manage service**:
  - Stop: `launchctl unload ~/Library/LaunchAgents/com.rgfx.backup.plist`
  - Start: `launchctl load ~/Library/LaunchAgents/com.rgfx.backup.plist`
  - Status: `launchctl list | grep rgfx`

## Claude Specialized Agents

**CRITICAL - USE SPECIALIZED AGENTS FOR EXPERTISE:**

This project has specialized Claude agents available for specific domains. **ALWAYS use these agents** when working with their respective technologies.

**gitlab-expert**
- **Use for**: GitLab CI/CD pipelines, GitLab Pages, jobs, runners, merge requests, branch protection, tags, releases, glab CLI
- **Also use for**: Debugging pipeline failures, configuring `.gitlab-ci.yml`, troubleshooting build artifacts, understanding GitLab's browser UI

**platformio-esp32-expert**
- **Use for**: PlatformIO development for ESP32 microcontrollers
- **Topics include**:
  - Setting up or configuring PlatformIO projects for ESP32
  - Understanding `platformio.ini` configuration options and environments
  - Troubleshooting ESP32 compilation, upload, or runtime issues
  - Integrating PlatformIO with VSCode (tasks, debugging, IntelliSense)
  - ESP32-specific features (dual-core, WiFi, Bluetooth, peripherals)
  - Build flags, library dependencies, and board configurations
  - OTA updates, serial monitoring, and debugging workflows
  - Memory management, SPIFFS/LittleFS, and NVS storage on ESP32

## Planning and Documentation Preferences

**CRITICAL - NO TIMELINES IN PLANS:**
- **NEVER include time estimates, day counts, or schedules** in implementation plans
- User does NOT want to see "Day 1:", "3-5 days", "Estimated timeline", etc.
- **Focus on logical phases and implementation steps** without time projections

## Development Workflow

**CRITICAL - INCREMENTAL IMPLEMENTATION AND TESTING:**

Like a veteran professional engineer with decades of experience, **ALWAYS work incrementally**:

1. **One change at a time** - Make small, focused changes
2. **Test after each change** - Compile, run tests, verify functionality
3. **Never batch changes** - Don't implement multiple features before testing
4. **Verify before proceeding** - Each step must work before moving to the next
5. **Use TodoWrite to track** - Break work into small, testable increments

**CRITICAL - PRE-COMMIT CHECKS:**

This project uses a **pre-commit hook** to enforce code quality. The hook automatically runs before every commit:

1. **TypeScript type checking** (`npm run typecheck`)
2. **ESLint with auto-fix** (`npm run lint -- --fix`)
3. **Unit tests** (`npm test`)

**All checks must pass** before the commit is allowed. Install: `./scripts/install-git-hooks.sh`

**CRITICAL - ALWAYS LINT AFTER EDITING:**

Before committing ANY code changes, manually run these checks during development:

```bash
cd rgfx-hub
npm run lint -- --fix  # Auto-fix formatting and lint issues
npm run typecheck      # Check TypeScript errors
npm test               # Run unit tests
```

**CRITICAL - FEATURE BRANCH WORKFLOW:**

This project uses a **feature branch workflow** with CI/CD testing and merge request approvals. The `main` branch is **protected** - you cannot push directly to it.

**ALL changes must go through feature branches and merge requests.** No exceptions.

### Workflow Steps:

**1. Create a feature branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
# Make changes...
git commit -m "Add new feature"
git push origin feature/my-new-feature
```

**2. CI runs automatically:**
- **Test stage** runs on your feature branch
- TypeScript checks, ESLint, unit tests, ESP32 compilation
- Must pass before you can merge

**3. Create a merge request:**

```bash
glab mr create --fill --yes
```

**CRITICAL - MR OVERVIEW MUST SUMMARIZE ALL COMMITS:**

When creating the MR overview/description, **ALWAYS summarize ALL commits** in the merge request, not just the first one. The overview should provide a comprehensive summary of the entire branch's changes.

**CRITICAL - ALWAYS MONITOR CI PIPELINES:**

After pushing a feature branch or creating a merge request, **ALWAYS actively monitor the CI pipeline** until completion.

**Required workflow:**
1. After `git push` or `glab mr create`, immediately check initial status:
   ```bash
   glab ci status -b <branch-name>
   ```
2. **Inform the user immediately**:
   - "Pipeline started. Jobs: test:hub, test:driver (~5 min typical duration)"
   - Provide pipeline URL for manual monitoring
   - State: "I will actively monitor and notify you when it completes"
3. **Set up active polling loop:**
   - Every 60 seconds (1 minute), run: `glab ci status -b <branch-name>`
   - Parse the output to detect state changes
   - Look for "Pipeline state: running" vs "Pipeline state: success/failed"
4. **When pipeline completes**, notify the user IMMEDIATELY with a clear message:
   - ✅ **Success**: "🎉 PIPELINE PASSED! All tests successful (test:hub: 2m 48s, test:driver: 4m 27s)"
   - ❌ **Failure**: "❌ PIPELINE FAILED! Job '<job-name>' failed. Fetching logs..." then run `glab ci trace <job-name>`
5. If failed, automatically fetch and analyze error logs

**Why active polling instead of --live background:**
- Background `--live` processes exit unpredictably and don't trigger notifications
- Active polling ensures reliable state change detection
- Direct control over when to check and when to notify
- Can parse output reliably and trigger immediate user alerts

**DO NOT use `--live` with `run_in_background`** - it doesn't work for reliable monitoring

**4. Main branch updated** - Test + Build stages run, artifacts created

**5. Create a release:**
```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

### GitLab CLI (glab)

```bash
brew install glab
glab auth login  # First-time authentication
glab mr create --fill --yes
glab mr list
glab ci status -b <branch-name>
```

## Scripting Language Preference

**CRITICAL - ALWAYS USE NODE.JS FOR SCRIPTS:**

- **Preferred**: Node.js/JavaScript for ALL custom scripts
- **Avoid**: Python scripts unless absolutely necessary
- **Rationale**: Consistent tooling, better IDE support, easier maintenance

## Documentation - READ FIRST

**CRITICAL - START EVERY NEW CHAT SESSION BY REVIEWING LOCAL DOCS:**

Before starting ANY conversation or implementing features, ALWAYS review local documentation in `docs/` directory.

**Available local docs:**
1. **MAME Lua API** - `mame/docs/mame_docs/` (comprehensive EPUB extraction)
2. **arduino-mqtt library** - `docs/arduino-mqtt.md`
3. **Aedes MQTT broker** - `docs/aedes.md`
4. **Zustand state management** - `docs/zustand.md`
5. **ESP32 Preferences library** - `docs/esp32-preferences.md`
6. **Vitest testing framework** - `docs/vitest.md`

**Documentation lookup priority:**
1. **FIRST**: Read local documentation files
2. **SECOND**: Use WebSearch/WebFetch only if local docs are insufficient
3. **NEVER**: Guess or make assumptions

### MAME Documentation Protocol

**CRITICAL - READ THIS SECTION FULLY BEFORE ANSWERING ANY MAME QUESTIONS:**

When asked about MAME (Lua APIs, command-line options, features, configuration):

1. **NEVER use Grep to search for keywords** - This leads to incomplete understanding
2. **ALWAYS use the Read tool to read the complete relevant documentation files**
3. **READ AND UNDERSTAND the full context** before providing answers
4. **DO NOT guess or make assumptions**

The documentation in `mame/docs/mame_docs/` is comprehensive and authoritative.

### MAME Lua API Reference

The extracted MAME EPUB documentation contains comprehensive API reference:

- `mame/docs/mame_docs/luascript/index.xhtml` - Lua scripting overview
- `mame/docs/mame_docs/luascript/ref-core.xhtml` - Core APIs
- `mame/docs/mame_docs/luascript/ref-mem.xhtml` - Memory system
- `mame/docs/mame_docs/luascript/ref-devices.xhtml` - Device APIs
- `mame/docs/mame_docs/commandline/commandline-all.xhtml` - Command-line options

The embedded Lua environment is **Lua 5.4** with Sol3 bindings.

## Terminology

**CRITICAL - ALWAYS USE CORRECT TERMS:**

- **Hub** - The main Electron app (`rgfx-hub/`) that runs on your computer. Central controller that monitors game events.
- **Driver** - The ESP32 firmware (`esp32/`) that runs on physical hardware. Controls LED hardware.

**NEVER use "device" as a generic term** - this is too ambiguous. Always be specific:
- Use **"Hub"** when referring to the main application
- Use **"Driver"** when referring to ESP32 units
- Use **"LED device"** when referring to physical LED strips/matrices

**Code naming conventions:**
- TypeScript types: `Driver`, `DriverSystemInfo`, `DriverStats`
- Variables: `driver`, `drivers`, `driverRegistry`
- Functions: `onDriverConnected`, `registerDriver`
- IPC channels: `driver:connected`, `driver:disconnected`
- Components: `DriverCard`, `DriverList`

## File Naming Conventions

**CRITICAL - ALWAYS FOLLOW THESE STANDARDS:**

Each sub-project follows its ecosystem's file naming conventions. **Consistency within each project is mandatory.**

### rgfx-hub/ (TypeScript/React/Electron)

**Standard: kebab-case for all files**

**ALL files use kebab-case** (lowercase with hyphens):
- TypeScript modules: `driver-registry.ts`, `event-file-reader.ts`
- React components: `driver-card.tsx`, `system-status.tsx`
- Test files: `driver-registry.test.ts`, `mqtt.test.ts`

#### Code Naming (Inside Files)

**Classes, Interfaces, Types, Enums:** `PascalCase`
**Functions, Methods, Variables, Properties:** `camelCase`
**Constants:** `UPPER_SNAKE_CASE`
**React Components:** `PascalCase` (required by React)
**Boolean variables/props:** Use `is`, `has`, `should` prefixes
**Callback functions:** Prefix with `on` to distinguish from state

Example:
```typescript
// State (data)
const drivers: Driver[] = [];
const connected: boolean = true;

// Callbacks/Actions (functions)
const onDriverConnected = (driver: Driver) => { /* ... */ };
const onDriverDisconnected = (driver: Driver) => { /* ... */ };
```

**Why this matters:** Without the `on` prefix, `driverConnected` looks like boolean state, not a callback function.

**Type parameters:** Single uppercase letter or `PascalCase`

#### Prohibited Patterns

❌ **NO `I` prefix for interfaces**
❌ **NO `_` prefix for private members** (use TypeScript `private` keyword)
❌ **NO Hungarian notation** (type prefixes)
❌ **NO mixing file naming conventions**

#### Rationale

**Why kebab-case for files:**
1. **Cross-platform safety** - Works identically on case-insensitive (macOS, Windows) and case-sensitive (Linux) filesystems
2. **Modern ecosystem alignment** - Next.js routing, file-based routing frameworks prefer kebab-case
3. **URL-friendly** - `user-profile` naturally maps to `/user-profile` routes
4. **Visual clarity** - Clear separation between file names (kebab-case) and code identifiers (PascalCase/camelCase)
5. **Consistency** - One convention for all files eliminates cognitive overhead

### esp32/ (C++/Arduino/PlatformIO)

**Standard: snake_case for all files** ✅
- Examples: `config_leds.cpp`, `sys_info.h`, `driver_config.cpp`, `mqtt.cpp`

**Code naming:**
- Variables/Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### mame/lua/ (Lua)

**Standard: snake_case for all files** ✅
- Examples: `rgfx.lua`, `event.lua`, `pacman_rgfx.lua`

**Lua Code Formatting and Linting:**
- **Formatter**: StyLua (`brew install stylua`)
- **Linter**: luacheck (`brew install luacheck`)

**CRITICAL - ALWAYS format and lint Lua files after editing:**
```bash
cd mame/lua && stylua . && luacheck .
```

## Code Quality Standards

**CRITICAL - SEPARATION OF CONCERNS IS PARAMOUNT:**

Each layer in the architecture should have a SINGLE, WELL-DEFINED responsibility. NEVER let responsibilities bleed between layers.

**ESP32 Effect System Architecture:**
- **main.cpp**: ONLY knows about UDP. Receives UDP messages and passes to effect processor.
- **udp.cpp**: ONLY parses JSON into effect name + props object. NO defaults, NO interpretation.
- **effect-processor.cpp**: ONLY routes effect names to the correct effect via lookup table. Passes props through untouched.
- **Individual effects (pulse.cpp, wipe.cpp, etc.)**: ONLY place where props are parsed and defaults are defined.

**NEVER:**
- Parse props in main.cpp
- Set defaults in UDP parser
- Extract specific props in effect processor
- Mix concerns between layers

**Example of WRONG approach:**
```cpp
// UDP parser setting defaults - WRONG!
pendingMessage.duration = props["duration"] | 500;

// main.cpp parsing color - WRONG!
uint32_t color = parseColor(message.props["color"]);
effectProcessor->trigger(message.effect, color);
```

**Example of CORRECT approach:**
```cpp
// UDP: Just parse and pass through
pendingMessage.props = doc["props"];

// main.cpp: Just route
effectProcessor->trigger(message.effect, message.props);

// Effect processor: Just lookup and delegate
wipeEffect.trigger(props);

// Individual effect: Parse with defaults
uint32_t duration = props["duration"] | 2000;  // ✅ Default lives here
```

**CRITICAL - ALWAYS ENFORCE:**

### Research and Documentation

**NEVER GUESS OR ASSUME:**
1. **Research first** - Use WebSearch and WebFetch before implementing
2. **Check local docs** - Always check local documentation first
3. **Check library examples** - Read example code in library's examples folder
4. **Verify recency** - DO NOT use information over 2 years old
5. **When stuck** - ASK rather than guessing

**CRITICAL - Avoid Guessing Rabbit Holes:**
- If you try 2-3 approaches and they all fail, STOP and research
- **NEVER get stuck in a guessing loop** - After a couple attempts, look online for solutions

**CRITICAL - Never Promise to "Remember" Without Documentation:**
- NEVER say "I'll make a note" or "I'll remember" without actually updating CLAUDE.md
- Update CLAUDE.md immediately when establishing new patterns

**CRITICAL - When User Says "ALL", They Mean ALL:**
- Use comprehensive searches that include ALL file types
- Don't use narrow patterns (e.g., only `.ts` files)

### TypeScript and Lint Errors

**MUST FIX IMMEDIATELY:**
1. **ALWAYS fix TypeScript errors** - Run `npm run typecheck`
2. **ALWAYS fix ESLint errors** - Run `npm run lint`
3. **CRITICAL: ALWAYS LINT AFTER EVERY CODE CHANGE**
4. **After updating TypeScript files** - Run `npm run lint -- --fix`
5. **Use npm scripts, not npx** - Use `npm run typecheck` not `npx tsc`
6. **Zero tolerance** - Never leave code with errors

### Testing Standards

**MEANINGFUL TESTS ONLY:**
1. **No shallow tests** - Don't just test static input objects for coverage
2. **Test real behavior** - Verify actual functionality, edge cases, error conditions
3. **Test dynamic scenarios** - Realistic data, state changes, async operations
4. **Quality over coverage** - Few meaningful tests better than many shallow tests

**FORBIDDEN TEST PRACTICES:**
1. **NO HACKS** - Never use hacks to make tests pass
2. **NO API MODIFICATION** - Never modify native APIs to fix tests
3. **NO APP CODE CHANGES** - Never modify app code just to make tests pass
4. **NO SKIPPING TESTS** - Never use `.skip()`, `xit()`, or comment out tests
5. **WE ARE NOT DOING TDD** - Tests follow implementation
6. **If a test is hard to write** - The test approach is wrong, not the code

### Code Style and Architecture

**CLEAN, EFFICIENT, READABLE:**
1. **Optimized but readable** - Performant code that's easy to understand
2. **Add comments where necessary** - Explain complex logic, business rules, non-obvious decisions
3. **Modular design** - Small, single-responsibility functions and classes
4. **Technology agnostic** - Loosely coupled code
5. **KISS principle** - Simplest solution that works is best

**Comment Guidelines:**
- **NEVER add comments about your thought process** - Other engineers don't care
- **NEVER add obvious comments** - Don't describe "what" if it's clear from the code
- **NO "what" comments** - Never comment what the code is doing if it's self-explanatory
- **DO add comments for "why"** - Business logic, edge cases, workarounds, non-obvious decisions

**Examples of BAD comments:**
```cpp
// Parse color
uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;

// Parse duration
uint32_t duration = props["duration"] | DEFAULT_DURATION;

// Add the wipe
Wipe newWipe;
```

**Examples of GOOD comments:**
```cpp
// Use alpha blending to avoid flickering when multiple pulses overlap
matrix.leds[i] = blend(matrix.leds[i], pulseColor, pulse.alpha);

// Cache deltaTime to avoid redundant float→int conversions in tight loop
uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);
```

**Data-Driven Code:**
- **Prefer lookup tables over long if/else chains**
- Data structures are easier to maintain than branching logic

Example:
```cpp
// Good: Lookup table
CRGB colors[] = {CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::Yellow};
color = colors[segment];
```

### Asynchronous Code Patterns

**CRITICAL - AVOID FRAGILE setTimeout() CALLS:**

1. **setTimeout is FRAGILE** - Never assume how long operations will take
2. **Use async/await** - Wait for actual completion
3. **Use Promises** - Return and await Promises
4. **Event-driven patterns** - Use events and callbacks

**When setTimeout IS acceptable:**
- Tests: Simulating async delays
- Debouncing/throttling: User input handling
- Animation timing: Wall-clock time requirements

**Key principle:** If you're using setTimeout to "wait for something to finish", you're doing it wrong. Wait for the actual completion signal.

### Development Dependencies

**ALWAYS use --save-dev for development tools:**
- Testing frameworks, TypeScript, linters, formatters, build tools, type definitions (@types/*)

**Use regular dependencies ONLY for runtime code**

## Project Overview

RGFX intercepts memory changes in MAME-emulated arcade games and publishes game events via embedded MQTT broker in Hub for consumption by LED Drivers.

## Release Management

**For creating releases, see [docs/release-workflow.md](../docs/release-workflow.md)**

Key points:
- Git tags are source of truth (`v1.0.0`)
- Semantic versioning (MAJOR.MINOR.PATCH)
- CI/CD builds only on tags
- Manual release approval in GitLab

Version injection:
```bash
node scripts/inject-version-hub.js     # Updates rgfx-hub/package.json
node scripts/inject-version-driver.js  # Generates esp32/src/version.h
```

## MAME ROMs Location

**Path:** `/Users/matt/Workspace/mame0281-arm64/roms`

**Current ROMs:**
- **Arcade**: `pacman.zip`, `mspacman.zip`, `galaga.zip`
- **NES**: `smb.nes`, `smw.nes`, `castlevania_3.nes`

## Project Structure

VSCode multi-root workspace with sub-projects:
- **rgfx-hub** - Main Electron application (TypeScript/React)
- **mame** - MAME Lua scripts and configuration
- **esp32** - ESP32 firmware (PlatformIO project)

## Architecture

### MAME Lua Scripts (`mame/lua/`)
- `rgfx.lua` - Main entry point, loads game-specific interceptors
- `event.lua` - Event logging module (writes to temp file)
- `ram.lua` - RAM monitoring utilities
- `interceptors/` - Game-specific event handlers

### RGFX Hub (`rgfx-hub/`)
- Electron application with embedded Aedes MQTT broker
- Monitors MAME events file via `EventFileReader`
- Publishes events via embedded MQTT broker and UDP
- React + Material UI interface
- Built with Electron Forge + Vite

#### Driver Configuration

**Configuration File:** `rgfx-hub/config/drivers.json`

Single unified configuration file managed by `DriverPersistence`:
- Driver discovery metadata (id, name, type, firstSeen)
- LED hardware configurations (inline `ledConfig` for each driver)

**CRITICAL:** Hub sends snake_case property names (`led_devices`, `color_order`, `max_brightness`) to match ESP32 expectations. Hub's internal TypeScript uses camelCase, but converts to snake_case when publishing to MQTT.

### ESP32 Drivers (`esp32/`)
- PlatformIO firmware for ESP32 devices
- Controls LED hardware via FastLED
- Receives commands via MQTT and UDP
- mDNS device discovery

#### LED Test Mode

**Purpose:** Validate LED hardware, wiring, and coordinate mapping.

**How to use:**
1. In Hub UI, click "Test" button on driver card
2. Hub pushes config to driver, then sends test command
3. Driver displays test pattern

**Test Patterns:**
- **Strip layouts**: 25% segments in Red, Green, Blue, Yellow
- **Matrix layouts**: 4 quadrants - Top-Left: Red, Top-Right: Green, Bottom-Left: Blue, Bottom-Right: Yellow

## Event Format

Events are written as: `topic value`

Examples:
- `game pacman`
- `player/score/p1 1000`

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

1. **ALWAYS research first** using WebSearch and WebFetch
2. **Check if library/framework has built-in support**
3. **Look for existing solutions** before writing custom code
4. **Avoid reinventing the wheel**

**DO NOT:**
- Jump straight to implementation without research
- Assume you need to write custom code
- Ask user for permission to search - just do it

## RGFX Hub UI Technology Stack

**Technology Decision: React + Material UI**

The `rgfx-hub/` directory contains an Electron app configured with:
- **Electron Forge** with Vite plugin
- **TypeScript** for type safety
- **Vite** for fast bundling and hot module reload
- **Aedes** MQTT broker (embedded)
- **bonjour-service** for mDNS device discovery
- **React + Material UI** (default theme, no customization needed)

## ESP32 Development

**CRITICAL - DUAL-CORE ARCHITECTURE:**

- **Core 0 (Protocol Core)**: Network tasks - MQTT, WiFi, web server, OTA, OLED display (10ms cycle)
- **Core 1 (Application Core)**: LED effects and UDP processing (time-critical)

**IMPORTANT**: Display updates run on Core 0 and have **ZERO impact** on LED performance (Core 1).

**CRITICAL - ALWAYS COMPILE AFTER CHANGES:**

When modifying ESP32 code:
1. **ALWAYS compile**: `pio run --project-dir /Users/matt/Workspace/rgfx/esp32`
2. **Check for compilation errors** and fix immediately
3. **Never leave code in a non-compiling state**

**CRITICAL - Upload and Monitor Workflow:**
- **I will only compile**
- **You handle upload and monitoring** - Use VSCode tasks or manual commands
- **NEVER try to automate serial port access** - Causes blocking and port locking

### Over-The-Air (OTA) Firmware Updates

**OTA updates are fully configured and working!**

**How OTA Works:**
- Each driver advertises with unique hostname: `rgfx-driver-<device-id>`
- ArduinoOTA service runs on each driver
- Updates happen on Core 0 without blocking LED operations

**To upload firmware via OTA:**

```bash
# Discover devices
dns-sd -B _arduino._tcp local.

# Upload to specific device
pio run -e rgfx-driver-ota -t upload --upload-port rgfx-driver-f89a58.local
```

**OTA Upload Process:**
- Driver LEDs turn **ORANGE** when update starts
- LEDs turn **GREEN** when complete
- LEDs turn **RED** if failed
- Driver automatically restarts after success

## Node.js fs.watch Known Issues

**Problem:** On macOS, `fs.watch()` has initialization delay ([nodejs/node#52601](https://github.com/nodejs/node/issues/52601)).

**Solution:** Use probe event approach - see `rgfx-hub/src/__tests__/test-utils.ts` - `waitForFileWatcherReady()` utility.

**Decision for RGFX:**
- `EventFileReader` uses native `fs.watch` - acceptable for this use case
- Tests use `waitForFileWatcherReady()` utility
- If fs.watch becomes problematic in production, migrate to chokidar
