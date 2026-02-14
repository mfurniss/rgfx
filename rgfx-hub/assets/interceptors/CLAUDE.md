# Interceptors

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

## CRITICAL

Do not modify files in this folder directly. The runtime interceptor files are in `~/.rgfx/interceptors/`.

Files here are bundled with the app and copied to `~/.rgfx/interceptors/` on first run only.

## Testing with MAME

To launch MAME for testing: `scripts/launch-mame.sh <game> -playback <game>.inp`

To terminate MAME after testing: `pkill -9 -f "mame.*<game>"` (replace `<game>` with the ROM name). Do NOT use `kill $PID` — MAME's process tree requires `pkill -f` to reliably terminate.

## Structure

### Core Files
- `mame.lua` - MAME/emu type stubs for Lua language server (manager, emu, _G.event, _G.event_cleanup, _G.game_name); register callback name params are optional
- `rom_map.lua` - Maps ROM names (including variants) to game-specific interceptors
- `fft.lua` - FFT audio analysis interceptor

### Game Interceptors (games/)
Game-specific interceptors that monitor RAM and emit events:
- `galaga88_rgfx.lua` - Galaga '88
- `galaga_rgfx.lua` - Galaga (P1/P2 score tracking, tractor beam detection, bonus sprite scanning, fighter capture detection, perfect bonus detection, stage tracking)
- `gforce2_rgfx.lua` - G-LOC: Air Battle / G-Force 2
- `nes_smb_rgfx.lua` - NES Super Mario Bros (score dedup guard)
- `outrun_rgfx.lua` - OutRun (YM2151 FM note tracking with retrigger detection via duration counter, SegaPCM scaffolding disabled, ambilight enabled)
- `pacman_rgfx.lua` - Pac-Man
- `robotron_rgfx.lua` - Robotron 2084
- `shangon_rgfx.lua` - Super Hang-On (YM2151 FM note tracking with retrigger detection, ambilight enabled)
- `sharrier_rgfx.lua` - Space Harrier (YM2203 FM note tracking with Block/F-Number encoding, ambilight enabled)
- `ssf2_rgfx.lua` - Super Street Fighter II (QSound monitoring)
- `starwars_rgfx.lua` - Star Wars

### Special Interceptors
- `ambilight.lua` - Ambilight screen edge sampling with configurable zones, depth, event_interval, and brightness
