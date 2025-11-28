# MAME Integration

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

## MAME Documentation Protocol

**CRITICAL - READ THIS SECTION FULLY BEFORE ANSWERING ANY MAME QUESTIONS:**

When asked about MAME (Lua APIs, command-line options, features, configuration):

1. **NEVER use Grep to search for keywords** - This leads to incomplete understanding
2. **ALWAYS use the Read tool to read the complete relevant documentation files**
3. **READ AND UNDERSTAND the full context** before providing answers
4. **DO NOT guess or make assumptions**

The documentation in `mame/docs/mame_docs/` is comprehensive and authoritative.

## MAME Lua API Reference

The extracted MAME EPUB documentation contains comprehensive API reference:

- `mame/docs/mame_docs/luascript/index.xhtml` - Lua scripting overview
- `mame/docs/mame_docs/luascript/ref-core.xhtml` - Core APIs
- `mame/docs/mame_docs/luascript/ref-mem.xhtml` - Memory system
- `mame/docs/mame_docs/luascript/ref-devices.xhtml` - Device APIs
- `mame/docs/mame_docs/commandline/commandline-all.xhtml` - Command-line options

The embedded Lua environment is **Lua 5.4** with Sol3 bindings.

## MAME ROMs Location

**Path:** `/Users/matt/Workspace/mame0281-arm64/roms`

**Current ROMs:**
- **Arcade**: `pacman.zip`, `mspacman.zip`, `galaga.zip`
- **NES**: `smb.nes`, `smw.nes`, `castlevania_3.nes`

## MAME Lua Scripts

### Architecture (`mame/lua/`)

- `rgfx.lua` - Main entry point, loads game-specific interceptors
- `event.lua` - Event logging module (writes to temp file)
- `ram.lua` - RAM monitoring utilities
- `interceptors/` - Game-specific event handlers

## Running MAME with RGFX

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
