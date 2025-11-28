# Project Architecture

## Project Overview

RGFX intercepts memory changes in MAME-emulated arcade games and publishes game events via embedded MQTT broker in Hub for consumption by LED Drivers.

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

## Driver IDs

- **Format**: Sequential numbering: `rgfx-driver-0001`, `rgfx-driver-0002`, etc.
- **Max length**: 32 characters (alphanumeric + hyphens)
- **Storage**: Drivers store custom ID in NVS, Hub stores in `config/drivers.json`
- **User-editable**: Edit `drivers.json` directly (UI coming later)
- **MAC address**: Preserved in `macAddress` field for MQTT communication
- **OLED display**: Shows `RGFX 0001` (extracts ID part)
- **mDNS hostname**: `rgfx-driver-0001.local` (used for OTA updates)
- **Migration**: Hub automatically sends set-id command to drivers on first connection

## Project Structure

VSCode multi-root workspace with sub-projects:
- **rgfx-hub** - Main Electron application (TypeScript/React)
- **mame** - MAME Lua scripts and configuration
- **esp32** - ESP32 firmware (PlatformIO project)

## RGFX Hub (`rgfx-hub/`)

- Electron application with embedded Aedes MQTT broker
- Monitors MAME events file via `EventFileReader`
- Publishes events via embedded MQTT broker and UDP
- React + Material UI interface
- Built with Electron Forge + Vite

### Driver Configuration

**Configuration File:** `rgfx-hub/config/drivers.json`

Single unified configuration file managed by `DriverPersistence`:
- Driver discovery metadata (id, name, type)
- LED hardware configurations (inline `ledConfig` for each driver)

**CRITICAL:** Hub sends snake_case property names (`led_devices`, `color_order`, `max_brightness`) to match ESP32 expectations. Hub's internal TypeScript uses camelCase, but converts to snake_case when publishing to MQTT.

## ESP32 Drivers (`esp32/`)

- PlatformIO firmware for ESP32 devices
- Controls LED hardware via FastLED
- Receives commands via MQTT and UDP
- SSDP broker discovery (finds Hub's MQTT broker automatically)
- mDNS hostname registration for OTA updates (e.g., `rgfx-driver-0001.local`)

### LED Test Mode

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

## Event Processing

**CRITICAL - NO DEBOUNCE OR ARTIFICIAL DELAYS:**

- Events must be broadcast **as fast as possible** for lowest latency
- **NO debouncing** - each event triggers immediately
- **NO batching delays** - events are processed the moment they're detected
- `EventFileReader` uses `fs.watch()` only (no polling backup)
- If `fs.watch()` misses an event due to OS limitations, that's acceptable
- Latency is prioritized over reliability - LED effects must be instant

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
- **Aedes** MQTT broker (embedded) with SSDP announcement via `node-ssdp`
- **React + Material UI** (default theme, no customization needed)

### Custom Application Icon

**Icon assets location**: `rgfx-hub/assets/icons/`

**Workflow for creating/updating app icon**:

1. **Create source image**: Design an icon (recommended: 1024x1024 PNG)
2. **Save as**: `rgfx-hub/assets/icons/source/app-icon.png`
3. **Generate platform icons**: Run `node scripts/generate-icons.js` (from `rgfx-hub/` directory)
4. **Build app**: Run `npm run package` to test

**Generated files**:
- `icon.icns` - macOS application icon
- `icon.ico` - Windows application icon
- `icons/` - Linux icon set (PNG)
- Source image preserved for future regeneration

**Configuration**:
- `forge.config.ts` configured with `icon: "./assets/icons/icon"`
- Electron Forge auto-detects platform and uses correct extension
- DMG installer uses `.icns` file explicitly

**Important notes**:
- Icon only appears in packaged builds, NOT in `npm start` (development mode)
- macOS icon cache may need refresh (restart Finder or log out/in)
- Generator script uses `electron-icon-builder` (cross-platform, works on macOS/Linux/Windows)

## Node.js fs.watch Known Issues

**Problem:** On macOS, `fs.watch()` has initialization delay ([nodejs/node#52601](https://github.com/nodejs/node/issues/52601)).

**Solution:** Use probe event approach - see `rgfx-hub/src/__tests__/test-utils.ts` - `waitForFileWatcherReady()` utility.

**Decision for RGFX:**
- `EventFileReader` uses native `fs.watch` - acceptable for this use case
- Tests use `waitForFileWatcherReady()` utility
- If fs.watch becomes problematic in production, migrate to chokidar
