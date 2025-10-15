# RGFX - Retro Game Effects

A MAME Lua scripting framework for monitoring retro arcade game state and publishing events via MQTT.

## Project Overview

RGFX intercepts memory changes in MAME-emulated arcade games and publishes game events (score changes, ghost states, power-ups, etc.) to an MQTT broker for consumption by external applications.

## Architecture

1. **MAME Lua Scripts** (`lua/`)
   - `rgfx.lua` - Main entry point, loads game-specific interceptors
   - `event.lua` - Event logging module (writes to temp file)
   - `ram.lua` - RAM monitoring utilities
   - `interceptors/` - Game-specific event handlers
     - `pacman_rgfx.lua` - Pac-Man events (score, ghosts, power pills)
     - `galaga_rgfx.lua` - Galaga events (score)

2. **MQTT Bridge** (`rgfx_mqtt_bridge.py`)
   - Python app that tails event log file
   - Publishes events to MQTT broker with static terminal UI
   - Shows latest value for each topic in real-time

## Event Format

Events are written as: `topic value`

Example topics:
- `game` - ROM name
- `player/score/p1` - Player 1 score
- `ghost/red/state` - Ghost state (1=normal, 17=blue/vulnerable, 24=eaten, 25=eyes)
- `player/pill/state` - Power pill state

## Ghost States (Pac-Man)

From disassembled Ms. Pac-Man source code:
- `0x01` = red (normal)
- `0x03` = pink (normal)
- `0x05` = cyan (normal)
- `0x07` = orange (normal)
- `0x11` (17) = blue (vulnerable - power pill active)
- `0x12` (18) = white (flashing - power pill wearing off)
- `0x18` (24) = score display (200/400/800/1600 - ghost being eaten)
- `0x19` (25) = eyes (returning to ghost home after being eaten)
- `0x1d` (29) = cutscene color (intermissions only)

## Running

```bash
# Launch game with RGFX
./launch.sh pacman

# Start MQTT broker
mosquitto

# Start MQTT bridge (in another terminal)
python rgfx_mqtt_bridge.py
```

## Key Files

- `launch.sh` - Launches MAME with rgfx.lua autoboot script
- Event log: `$TMPDIR/rgfx_events.log` (macOS/Linux) or `%TEMP%\rgfx_events.log` (Windows)

## Code Style

- Use `_G.event()` for global event function (called from interceptors)
- Lua globals are intentional (event_file, event function)
- BCD score decoding uses bitwise operations for efficiency

## Documentation

### MAME Lua API Reference

**IMPORTANT**: When answering questions about MAME Lua scripting APIs, ALWAYS use the local documentation in `docs/mame_docs/` instead of searching the web. The extracted MAME EPUB documentation contains comprehensive API reference:

- `docs/mame_docs/luascript/index.xhtml` - Lua scripting overview and tutorial
- `docs/mame_docs/luascript/ref-core.xhtml` - Core APIs (machine manager, video, sound, UI)
- `docs/mame_docs/luascript/ref-mem.xhtml` - Memory system (address spaces, read/write operations)
- `docs/mame_docs/luascript/ref-devices.xhtml` - Device APIs (enumeration, screens, images)
- `docs/mame_docs/luascript/ref-input.xhtml` - Input system (I/O ports, keyboard)
- `docs/mame_docs/luascript/ref-render.xhtml` - Rendering APIs (overlays, textures)
- `docs/mame_docs/luascript/ref-debugger.xhtml` - Debugger integration (breakpoints, watchpoints)
- `docs/mame_docs/luascript/ref-common.xhtml` - Common types and globals

The embedded Lua environment is **Lua 5.4** with Sol3 bindings. Key global objects available:
- `emu` - Emulator interface (pause, app_name, app_version, frame callbacks)
- `manager` - Machine manager
- `manager.machine` - Currently running machine (devices, screens, memory spaces)
