# MAME Integration

## MAME Lua API Reference

For comprehensive MAME Lua API documentation, refer to the official docs:
- **Lua scripting overview**: https://docs.mamedev.org/luascript/
- **Core APIs**: https://docs.mamedev.org/luascript/ref-core.html
- **Memory system**: https://docs.mamedev.org/luascript/ref-mem.html
- **Device APIs**: https://docs.mamedev.org/luascript/ref-devices.html
- **Command-line options**: https://docs.mamedev.org/commandline/commandline-all.html

The embedded Lua environment is **Lua 5.4** with Sol3 bindings.

## MAME ROMs Location

Configure your MAME ROMs directory via MAME's `rompath` option or the `launch-mame.sh` script.
Common locations: `~/mame/roms`, `~/.mame/roms`

## MAME Lua Scripts

### Architecture (`rgfx-hub/assets/`)

Scripts are bundled in two subdirectories:

**`mame/`** - Core modules:
- `rgfx.lua` - Main entry point, loads game-specific interceptors
- `event.lua` - Event logging module (writes to temp file)
- `ram.lua` - RAM monitoring utilities

**`interceptors/`** - Game interception:
- `mame.lua` - MAME plugin entry point
- `rom_map.lua` - Maps ROM names to game-specific interceptor scripts
- `ambilight.lua` - Screen-edge color sampling for ambient lighting effects
- `fft.lua` - FFT audio analysis helper module
- `games/` - Game-specific event handlers

### Supported Games (from rom_map.lua)

**Arcade:**
- Pac-Man variants: `pacman`, `mspacman` → `pacman_rgfx.lua`
- Galaga: `galaga` → `galaga_rgfx.lua`
- Galaga '88: `galaga88` → `galaga88_rgfx.lua`
- Robotron 2084: `robotron` → `robotron_rgfx.lua`
- Star Wars (Atari 1983): `starwars` → `starwars_rgfx.lua`
- Super Street Fighter II: `ssf2`, `ssf2u`, `ssf2a`, etc. → `ssf2_rgfx.lua`
- OutRun: `outrun` → `outrun_rgfx.lua`

**NES:**
- Super Mario Bros: `smb`, `smw` → `nes_smb_rgfx.lua`
- Castlevania III: `castlevania_3` → `nes_castlevania3_rgfx.lua`

## Running MAME with RGFX

```bash
# Launch game with RGFX
./scripts/launch-mame.sh pacman

# Start RGFX Hub (in another terminal)
cd rgfx-hub
npm start
```

## Key Files

- `scripts/launch-mame.sh` - Launches MAME with rgfx.lua autoboot script
- Event log: `$TMPDIR/rgfx_events.log` (macOS/Linux) or `%TEMP%\rgfx_events.log` (Windows)
