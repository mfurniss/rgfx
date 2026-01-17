# Interceptors

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

## CRITICAL

Do not modify files in this folder directly. The runtime interceptor files are in `~/.rgfx/interceptors/`.

Files here are bundled with the app and copied to `~/.rgfx/interceptors/` on first run only.

## Structure

### Core Files
- `mame.lua` - Main entry point loaded by MAME plugin system
- `rom_map.lua` - Maps ROM names to game-specific interceptors
- `fft.lua` - FFT audio analysis interceptor

### Game Interceptors (games/)
Game-specific interceptors that monitor RAM and emit events:
- `galaga88_rgfx.lua` - Galaga '88
- `nes_smb_rgfx.lua` - NES Super Mario Bros
- `outrun_rgfx.lua` - OutRun
- `pacman_rgfx.lua` - Pac-Man
- `robotron_rgfx.lua` - Robotron 2084
- `ssf2_rgfx.lua` - Super Street Fighter II (QSound monitoring)
- `starwars_rgfx.lua` - Star Wars

### Special Interceptors
- `ambilight.lua` - Ambilight effect based on screen colors
