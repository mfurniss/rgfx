# MAME Core Modules

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

These are the core Lua modules that run inside MAME's embedded Lua 5.4 environment. They are loaded via MAME's `-autoboot_script` option.

MAME provides `emu` and `manager` as global objects — these are not bugs or undefined globals. The `.luarc.json` in this folder configures the Lua language server accordingly.

---

## Files

| File | Purpose |
|------|---------|
| `rgfx.lua` | Bootstrap entry point — sets up paths, detects ROM/cartridge, loads interceptor. Reads `rom_map.json` via inline `parse_json_map()` (MAME's json plugin isn't accessible from autoboot scripts) |
| `event.lua` | Event logging — writes to `~/.rgfx/interceptor-events.log`, defines `_G.event()` and `_G.boot_delay()` |
| `ram.lua` | RAM monitoring — watches memory addresses and fires callbacks on value changes |
| `sprite-extract.lua` | Extracts sprite graphics from ROM regions and writes JSON files matching GifBitmapResult format |

---

## Bootstrap Flow (rgfx.lua)

1. Sets up `package.path` for system modules (this folder) and user files (`~/.rgfx/interceptors/`)
2. Defines `parse_json_map()` for parsing `rom_map.json` (MAME's json plugin isn't accessible from autoboot scripts)
3. Loads `event.lua` (defines `_G.event` and `_G.boot_delay`)
4. On machine prestart/first frame:
   - Detects cartridge name (console systems) or uses ROM name (arcade)
   - Looks up interceptor via `rom_map.json` (parsed with `parse_json_map()`), falls back to `{name}_rgfx`
   - Sends `rgfx/reset` event to clear driver state
   - Loads the game-specific interceptor
   - Waits 30 frames (~500ms) then sends `{game}/init` event with the MAME system description as payload

---

## Boot Delay (event.lua → `_G.boot_delay`)

Many games run hardware tests or attract screens before gameplay. Interceptors call `_G.boot_delay(seconds)` to suppress all events (except `/init` topics) until the delay expires.

```lua
_G.boot_delay(6)  -- Suppress events for 6 seconds
```

- Displays a countdown in the MAME console
- Events are silently dropped during the delay (not queued)
- The `/init` topic is always allowed through
- Defined in `event.lua`, not `ram.lua`

---

## Event System (event.lua → `_G.event`)

```lua
_G.event(topic, message)
```

- Writes `topic message\n` to `~/.rgfx/interceptor-events.log`
- File is opened in append mode (`"a"`) with `setvbuf("no")` for immediate flushing. Append mode uses `O_APPEND` so writes always go to EOF, even if the hub trims the file mid-session.
- Topics must be 1-4 segments of lowercase alphanumeric, hyphens, underscores (validated)
- Auto-recovers if the log file is deleted (periodic existence check every 5 seconds)
- Sanitizes newlines/tabs in messages to keep events on single lines

---

## RAM Monitoring (ram.lua)

### Monitor Map (recommended)

```lua
local map = {
    player_score = {
        addr_start = 0x4E80,
        size = 4,
        callback_changed = function(value, previous)
            _G.event("galaga/player/score/p1", value)
        end,
    },
}
ram.install_monitors(map, mem)
```

### Individual Monitor

```lua
local handle = ram.install_ram_monitor({
    mem = cpu.spaces["program"],
    start_addr = 0x4E80,
    end_addr = 0x4E83,
    size = 4,              -- 1 (byte), 2 (word), or 4 (dword)
    name = "player_score",
    callback_changed = function(value, previous) end,
})

handle.disable()  -- Temporarily stop
handle.enable()   -- Resume
handle.remove()   -- Permanently remove
```

### Monitor Options

| Option | Required | Description |
|--------|----------|-------------|
| `addr_start` | Yes | Starting memory address |
| `addr_end` | No | Ending address (defaults to `addr_start`) |
| `size` | No | Bytes to read: 1, 2, or 4 (default: 1) |
| `callback` | No | `function(addr, current, previous)` — called per changed address |
| `callback_changed` | No | `function(current, previous)` — simpler form for single addresses |

Monitors run on `emu.register_frame_done` — values are checked every frame.

---

## Sprite Extraction (sprite-extract.lua)

Extracts sprite graphics from MAME ROM regions and writes them as JSON files. Called by game interceptors with a manifest table describing which sprites to extract and how to decode them.

### Supported Formats

| Format | Tile Size | Description |
|--------|-----------|-------------|
| `namco` | 16x16 | Namco 2bpp strip-based (Pac-Man, Galaga) |
| `nes_2bpp` | 8x8 | NES 2bpp planar (Super Mario Bros, etc.) |

### Manifest Fields

| Field | Description |
|-------|-------------|
| `gfx_region` | MAME memory region tag (e.g., `":gfx1"`, `":nes_slot:cart:chr_rom"`) |
| `sprite_offset` | Byte offset where sprites start |
| `tile_format` | `{ format, width, height, bytes_per_sprite }` |
| `color_prom` | `{ region, offset, count, format }` (optional for NES) |
| `palette_prom` | `{ region, offset, colors_per_entry }` (optional for NES) |
| `rotation` | Screen rotation in degrees (0, 90, 180, 270) |
| `output_dir` | Output directory for JSON files |

### Per-Sprite Options

| Option | Description |
|--------|-------------|
| `index` | ROM sprite index (single-frame, single-tile) |
| `tiles` | Array of tile indices in row-major order for meta-sprite composition |
| `grid` | `{cols, rows}` tile arrangement (default `{1,1}`) |
| `palette` | Palette PROM index (ROM-derived palette) |
| `frames` | Array of `{ index/tiles, color_map, transparent_pixels }` for multi-frame sprites |
| `color_map` | Remap ROM pixel values to output palette indices (e.g., `{ [3] = 0xA }`) |
| `transparent_pixels` | Pixel values to treat as transparent (e.g., `{ 3 }` masks ghost body) |

### Meta-Sprite Composition

NES sprites larger than 8x8 are composed from multiple tiles. Specify `tiles` (array of tile indices in row-major order) and `grid` (`{cols, rows}`). Tile index `0xFC` is treated as blank. Example: a 16x16 sprite uses `grid = {2, 2}` with 4 tile indices.

### Image Trimming

Single-frame sprites are automatically trimmed: empty top/bottom rows removed, trailing spaces removed, and common leading whitespace stripped. Multi-frame sprites skip per-frame trimming and instead use `align_frames()` to crop all frames to a unified bounding box, preventing animation jitter from differently-sized frames.

### JSON Output Format

Output contains only `images` and optionally `palette`. Dimensions and frame count are derived by the hub's `loadSprite()` function from the images array.

```json
{ "images": [["row1", "row2"]], "palette": ["#FF0000"] }
```

- `palette` is only included when using ROM color PROMs (not when using `color_map`)
- Sprites using `color_map` rely on the default PICO-8 palette in the hub
- Palette uses 1-based Lua indexing internally so `ipairs` writes all entries correctly
- Extraction log reports actual trimmed dimensions (not raw tile grid size)
