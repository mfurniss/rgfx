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

**CRITICAL - Cleanup Temporary Files:**
- **ALWAYS cleanup temporary files and directories** created during debugging or testing
- Common locations: `/tmp/`, `/private/tmp/`, test clone directories
- Before finishing a task, verify and remove any temporary artifacts created
- Use `rm -rf` to remove temporary test directories when done

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

This project has specialized Claude agents available for specific domains. **ALWAYS use these agents** when working with their respective technologies instead of trying to handle everything directly.

### Available Agents

**gitlab-expert**
- **Use for**: GitLab CI/CD pipelines, GitLab Pages, jobs, runners, merge requests, branch protection, tags, releases, glab CLI
- **Also use for**: Debugging pipeline failures, configuring `.gitlab-ci.yml`, troubleshooting build artifacts, understanding GitLab's browser UI
- **Examples**:
  - "The build pipeline is failing on the test stage"
  - "How do I set up GitLab Pages?"
  - "What's the glab command to create a merge request?"
  - Configuring CI/CD jobs and understanding pipeline syntax

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

### When to Use Agents

**DO use specialized agents:**
- Whenever you need information about their domains
- Before attempting complex configurations
- When debugging issues in their areas of expertise
- For researching best practices and current documentation

**DO NOT:**
- Try to handle specialized topics directly when an agent is available
- Guess about GitLab CI syntax - use gitlab-expert
- Guess about PlatformIO/ESP32 configuration - use platformio-esp32-expert

**Remember**: These agents have specialized knowledge and access to current documentation for their domains. Use them proactively to ensure accurate, up-to-date solutions.

## Planning and Documentation Preferences

**CRITICAL - NO TIMELINES IN PLANS:**
- **NEVER include time estimates, day counts, or schedules** in implementation plans
- User does NOT want to see "Day 1:", "3-5 days", "Estimated timeline", etc.
- **Focus on logical phases and implementation steps** without time projections
- Plans should describe WHAT needs to be done, not WHEN or HOW LONG

## Development Workflow

**CRITICAL - INCREMENTAL IMPLEMENTATION AND TESTING:**

Like a veteran professional engineer with decades of experience, **ALWAYS work incrementally**:

1. **One change at a time** - Make small, focused changes
2. **Test after each change** - Compile, run tests, verify functionality
3. **Never batch changes** - Don't implement multiple features before testing
4. **Verify before proceeding** - Each step must work before moving to the next
5. **Use TodoWrite to track** - Break work into small, testable increments

**Why This Matters:**
- Catches issues immediately when they're introduced
- Makes debugging trivial (you know exactly what broke)
- Reduces risk of cascading failures
- Maintains working state at all times
- Professional development practice

**Example - Good Approach:**
```
1. Add one configuration option
2. Compile and verify it works
3. Add next configuration option
4. Compile and verify it works
5. Continue incrementally...
```

**Example - Bad Approach (NEVER DO THIS):**
```
1. Add 5 configuration options at once
2. Compile everything together
3. Get multiple errors, unsure which change caused them
4. Spend time debugging and untangling issues
```

**CRITICAL - PRE-COMMIT CHECKS:**

This project uses a **pre-commit hook** to enforce code quality. The hook automatically runs before every commit:

1. **TypeScript type checking** (`npm run typecheck`)
2. **ESLint with auto-fix** (`npm run lint -- --fix`)
3. **Unit tests** (`npm test`)

**All checks must pass** before the commit is allowed. This ensures CI will pass and prevents pushing broken code.

**Installation:**
```bash
# After cloning the repository, run:
./scripts/install-git-hooks.sh
```

The hook is stored in `scripts/git-hooks/pre-commit` and installed to `.git/hooks/pre-commit`.

**CRITICAL - ALWAYS LINT AFTER EDITING:**

Before committing ANY code changes, the pre-commit hook will automatically run lint, prettier, and tests. However, you should still manually run these checks during development:

```bash
cd rgfx-hub
npm run lint -- --fix  # Auto-fix formatting and lint issues
npm run typecheck      # Check TypeScript errors
npm test               # Run unit tests
```

**CRITICAL - FEATURE BRANCH WORKFLOW:**

This project uses a **feature branch workflow** with CI/CD testing and merge request approvals. The `main` branch is **protected** - you cannot push directly to it.

### Workflow Steps:

**1. Create a feature branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
# Make changes...
# Pre-commit hook runs automatically: typecheck, lint, tests
git commit -m "Add new feature"
git push origin feature/my-new-feature
```

**2. CI runs automatically:**
- **Test stage** runs on your feature branch
- TypeScript checks, ESLint, unit tests, ESP32 compilation
- Fast feedback (~5-10 minutes)
- Must pass before you can merge

**3. Create a merge request:**

**Using glab CLI (Recommended):**
```bash
glab mr create --fill --yes
```
This automatically creates a merge request using the commit title/description.

**Alternative methods:**
- Git push option: `git push -o merge_request.create` (when pushing new branch)
- Web UI: Go to GitLab → Create merge request

**After MR creation:**
- CI runs again on the MR
- Review your changes
- Click "Merge" when CI passes

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

**Implementation - Active Polling Pattern:**
```bash
# Initial check
glab ci status -b feature/my-branch

# Poll every 60 seconds (1 minute) until completion detected
# In practice: Use multiple sequential Bash calls with status parsing
# When "Pipeline state: success" or "Pipeline state: failed" detected, alert user

# If failure detected, get logs immediately
glab ci trace <failed-job-name>
```

**Why active polling instead of --live background:**
- Background `--live` processes exit unpredictably and don't trigger notifications
- Active polling ensures reliable state change detection
- Direct control over when to check and when to notify
- Can parse output reliably and trigger immediate user alerts

**DO NOT use `--live` with `run_in_background`** - it doesn't work for reliable monitoring

**4. Main branch updated:**
- **Test + Build stages** run on main
- Artifacts (DMG, firmware) created
- Main is always in releasable state

**5. Create a release (when ready):**
```bash
git checkout main
git pull origin main
git tag v1.0.0  # Only tag main when it's stable!
git push origin v1.0.0
```
- **Full pipeline runs**: test → build → deploy → release
- GitLab Pages updated
- Manual approval required for release creation

### Key Rules:

- ❌ **Cannot push directly to main** - protected branch
- ✅ **All changes via merge requests**
- ✅ **CI must pass before merge**
- ✅ **Tags are immutable** - never delete/recreate
- ✅ **Main always passes CI** - only merged code that passed tests

### GitLab CLI (glab)

**Installation:**
```bash
brew install glab
```

**First-time authentication:**
```bash
glab auth login
```
Follow the browser authentication flow (recommended).

**Common glab commands:**
```bash
glab mr create --fill --yes        # Create MR from current branch
glab mr list                       # List merge requests
glab mr view                       # View current MR
glab mr merge                      # Merge approved MR
glab mr close                      # Close MR
```

### GitLab Protected Branch Settings:

- **Allowed to merge**: Maintainers
- **Allowed to push and merge**: No one (forces MRs)
- **Allowed to force push**: Disabled

## Scripting Language Preference

**CRITICAL - ALWAYS USE NODE.JS FOR SCRIPTS:**

- **Preferred**: Node.js/JavaScript for ALL custom scripts
- **Avoid**: Python scripts unless absolutely necessary and impossible with Node.js
- **Rationale**:
  - Consistent tooling across the entire project
  - Better IDE support and debugging
  - Leverages existing Node.js ecosystem
  - Easier maintenance with single language

**When writing build scripts, utilities, or automation:**
1. **FIRST**: Attempt to implement in Node.js
2. **ONLY IF**: Node.js is definitively not possible, then consider alternatives
3. **Examples of Node.js use cases**:
   - File operations (Node.js `fs` module)
   - Build scripts (PlatformIO pre/post scripts)
   - CI/CD helper scripts
   - Code generation
   - Version management

**Note**: Some tools (like PlatformIO) use Python internally, but that's transparent. Our custom scripts should be Node.js.

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
3. **Check library examples** - When working with unfamiliar libraries, ALWAYS read the example code in the library's examples folder first
4. **Verify recency** - DO NOT use information from the web that is over 2 years old
5. **No assumptions** - If uncertain about API usage, library features, or best practices, RESEARCH or ASK
6. **Best practices** - Follow industry best practices for the technologies in use (TypeScript, React, Electron, etc.)
7. **When stuck** - ASK the senior developer rather than guessing or using outdated approaches

**CRITICAL - Avoid Guessing Rabbit Holes:**
- If you try 2-3 approaches and they all fail, STOP and research
- Look for library documentation, examples, or similar code in the project
- Do NOT continue trying random solutions - this wastes time
- When debugging library integration issues, read the library's example code FIRST

**CRITICAL - Never Promise to "Remember" Without Documentation:**
- NEVER say "I'll make a note" or "I'll remember" without actually updating CLAUDE.md
- If something is important enough to mention remembering, it's important enough to document
- Update CLAUDE.md immediately when establishing new patterns or lessons learned
- The user should not have to remind you to document what you claim to remember

### TypeScript and Lint Errors

**MUST FIX IMMEDIATELY:**
1. **ALWAYS fix TypeScript errors** - Run `npm run typecheck` and fix all errors before completing any task
2. **ALWAYS fix ESLint errors** - Run `npm run lint` and fix all errors/warnings before completing any task
3. **CRITICAL: ALWAYS LINT AFTER EVERY CODE CHANGE** - Run `npm run lint` immediately after editing any TypeScript/JavaScript file
4. **After updating TypeScript files** - ALWAYS run `npm run lint -- --fix` to auto-fix formatting issues
5. **Use npm scripts, not npx** - TypeScript is installed locally, use `npm run typecheck` (efficient) not `npx tsc` (inefficient)
6. **Zero tolerance** - Never leave code in a state with TypeScript or lint errors
7. **Before committing** - ALWAYS run both `npm run typecheck` and `npm run lint` to ensure CI will pass

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

## Release Management

**For creating releases and version management, see [docs/release-workflow.md](../docs/release-workflow.md)**

Key points:
- **Git tags are the source of truth** for versions (e.g., `v1.0.0`)
- **Semantic versioning** (MAJOR.MINOR.PATCH)
- **CI/CD builds only on tags** - not on every commit
- **Manual release approval** - Click "Play" button in GitLab to approve release creation
- **ALL tests must pass** - TypeScript, ESLint (warnings = error), unit tests, PlatformIO tests
- **macOS builds only** for now
- **Python scripts kept** for PlatformIO (required by PlatformIO's extra_scripts system)
- **Version management** via Node.js scripts in `scripts/` directory

### Version Injection

Version is automatically injected into all artifacts from git tags:

```bash
# Generate version files before building
node scripts/inject-version-hub.js     # Updates rgfx-hub/package.json
node scripts/inject-version-driver.js  # Generates esp32/src/version.h
```

**In CI/CD**: Version injection happens automatically before builds.

**Locally**: Run version scripts manually or they'll use development version (0.0.1-dev+<commit>).

Quick release:
```bash
git tag v1.0.0
git push origin v1.0.0
# CI builds automatically
# Navigate to CI/CD > Pipelines in GitLab
# Click "Play" on create:release job to approve
```

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

#### Driver Configuration

**Configuration File:** `rgfx-hub/config/drivers.json`

The Hub uses a **single unified configuration file** managed by `DriverPersistence` to store:
- Driver discovery metadata (id, name, type, firstSeen)
- LED hardware configurations (inline `ledConfig` for each driver)

**Structure:**
```json
{
  "version": "1.0",
  "drivers": [
    {
      "id": "44:1D:64:F8:9A:58",
      "name": "rgfx-driver-f89a58",
      "type": "driver",
      "firstSeen": 1761512509975,
      "ledConfig": {
        "driver_id": "44:1D:64:F8:9A:58",
        "friendly_name": "Dev Board 8x8 Matrix",
        "version": "1.0",
        "led_devices": [ /* LED device configs */ ],
        "settings": { /* driver settings */ }
      }
    }
  ]
}
```

**Key Points:**
- **One file** contains all driver metadata and LED configurations
- `ledConfig` is stored inline within each driver entry (not in separate files)
- Managed by `DriverPersistence` class ([driver-persistence.ts](rgfx-hub/src/driver-persistence.ts))
- Types defined in [types.ts](rgfx-hub/src/types.ts) (`DriverConfig`, `LEDDevice`, `DriverSettings`)
- Configuration is pushed to drivers via MQTT when they connect

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

**CRITICAL - DUAL-CORE ARCHITECTURE:**

The ESP32 Driver firmware uses a **dual-core architecture** for maximum performance:

- **Core 0 (Protocol Core)**: Network tasks - MQTT, WiFi, web server, OTA updates, OLED display updates
  - Runs as FreeRTOS task: `networkTask()`
  - 10ms cycle time
  - Handles all I2C, WiFi, and network operations

- **Core 1 (Application Core)**: LED effects and UDP processing
  - Runs in main `loop()`
  - Dedicated to time-critical LED rendering
  - FastLED.show() calls happen here
  - Low-latency UDP game event processing

**IMPORTANT**: Display updates run on Core 0 and have **ZERO impact** on LED performance (Core 1). You can update the OLED display as frequently as needed without affecting LED effects.

**CRITICAL - ALWAYS COMPILE AFTER CHANGES:**

When modifying any ESP32 code in the `esp32/` directory:

1. **ALWAYS compile after making changes** using: `pio run --project-dir /Users/matt/Workspace/rgfx/esp32`
2. **Check for compilation errors** and fix them immediately
3. **Never leave code in a non-compiling state**

This ensures code quality and catches errors early in development.

**CRITICAL - Upload and Monitor Workflow:**

- **I will only compile** - Use `pio run --project-dir /Users/matt/Workspace/rgfx/esp32`
- **You handle upload and monitoring** - Use VSCode tasks or manual commands
- **NEVER try to automate serial port access** - It causes blocking and port locking issues

### Over-The-Air (OTA) Firmware Updates

**OTA updates are fully configured and working!** You can update firmware wirelessly on any ESP32 driver connected to WiFi.

**How OTA Works:**
- Each driver advertises itself on the network with a unique hostname: `rgfx-driver-<device-id>` (e.g., `rgfx-driver-f89a58`)
- ArduinoOTA service runs on each driver, listening for firmware updates
- Updates happen on Core 0 (network core) without blocking LED operations

**To upload firmware via OTA:**

1. **Discover available devices:**
   ```bash
   # List all OTA-enabled devices on network
   dns-sd -B _arduino._tcp local.
   ```

2. **Upload to a specific device:**
   ```bash
   # Using hostname (recommended - works even if IP changes)
   pio run -e rgfx-driver-ota -t upload --upload-port rgfx-driver-f89a58.local

   # Or using IP address
   pio run -e rgfx-driver-ota -t upload --upload-port 192.168.10.62
   ```

3. **OTA Upload Process:**
   - Driver LEDs turn **ORANGE** when update starts
   - Progress logged every 10%
   - LEDs turn **GREEN** when update completes
   - LEDs turn **RED** if update fails
   - Driver automatically restarts after successful update

**When to use OTA vs Serial:**
- **Use OTA**: For drivers that are installed/mounted and hard to access physically
- **Use Serial**: For initial firmware upload, debugging, or if WiFi is not working
- **Pro tip**: Keep one driver on serial for development/debugging, update the rest via OTA

**OTA Configuration:**
- Defined in `esp32/platformio.ini` under `[env:rgfx-driver-ota]`
- Uses `espota` upload protocol
- Automatically discovers devices via mDNS
- No password required (can be added if needed)

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
