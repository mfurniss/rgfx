# Sprite Extraction

The sprite extraction module reads graphics data directly from MAME ROM regions and writes them as JSON sprite files for use with the [bitmap effect](../transformers/bitmaps.md). Instead of bundling pre-made sprite images, interceptors declare a manifest describing which sprites to extract and how to decode them.

## How It Works

```
Interceptor Manifest → sprite-extract.lua → JSON files → loadSprite() in transformer
```

1. An interceptor calls `sprite_extract.extract()` with a manifest table describing the ROM layout and sprites
2. The module reads the ROM's graphics region, decodes tile data, and applies color mapping
3. JSON sprite files are written to `transformers/bitmaps/` in your [config directory](../getting-started/hub-setup.md#config-directory)
4. Transformers load these files using [`loadSprite()`](../transformers/bitmaps.md#loading-json-sprites)

Extraction happens once when MAME loads the game. The generated JSON files are cached on disk and automatically picked up by transformers through [hot reload](../transformers/index.md#hot-reload).

## Basic Usage

```lua
local sprite_extract = require("sprite-extract")

sprite_extract.extract({
    gfx_region = ":gfx1",
    sprite_offset = 0x1000,
    tile_format = {
        format = "namco",
        width = 16, height = 16,
        bytes_per_sprite = 64,
    },
    color_prom = {
        region = ":proms",
        offset = 0x00,
        count = 32,
        format = "pacman",
    },
    palette_prom = {
        region = ":proms",
        offset = 0x20,
        colors_per_entry = 4,
    },
    rotation = 90,
    sprites = {
        { name = "cherry", index = 0, palette = 20 },
    },
    output_dir = "~/.rgfx/transformers/bitmaps",
})
```

## Supported Tile Formats

| Format | Tile Size | Bits per Pixel | Description |
|--------|-----------|----------------|-------------|
| `namco` | 16x16 | 2bpp | Namco strip-based layout used by Pac-Man, Galaga, and other Namco games |
| `nes_2bpp` | 8x8 | 2bpp | NES planar format used by Super Mario Bros. and other NES/Famicom games |

## Manifest Reference

The `extract()` function takes a single manifest table with these fields:

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gfx_region` | string | yes | MAME memory region tag for graphics data (e.g., `":gfx1"`, `":nes_slot:cart:chr_rom"`) |
| `sprite_offset` | number | yes | Byte offset where sprites start in the region |
| `tile_format` | table | yes | Tile decoder configuration (see below) |
| `color_prom` | table | no | Color PROM configuration for hardware palette decoding |
| `palette_prom` | table | no | Palette PROM configuration for palette index lookup |
| `rotation` | number | no | Screen rotation in degrees (0, 90, 180, 270). Rotates extracted sprites to match screen orientation. |
| `sprites` | array | yes | Array of sprite definitions |
| `output_dir` | string | yes | Output directory for JSON files. Use `~` for the home directory. |

### tile_format

| Field | Type | Description |
|-------|------|-------------|
| `format` | string | Decoder name (`"namco"` or `"nes_2bpp"`) |
| `width` | number | Tile width in pixels |
| `height` | number | Tile height in pixels |
| `bytes_per_sprite` | number | Bytes per tile in the ROM |

### color_prom (Optional)

Used by games that store colors in a hardware color PROM (like Pac-Man). Not needed when using `color_map`.

| Field | Type | Description |
|-------|------|-------------|
| `region` | string | MAME memory region tag for the color PROM |
| `offset` | number | Byte offset to the color data |
| `count` | number | Number of colors in the PROM |
| `format` | string | Decoder name (currently `"pacman"`) |

### palette_prom (Optional)

Used alongside `color_prom` to look up which colors belong to each palette entry.

| Field | Type | Description |
|-------|------|-------------|
| `region` | string | MAME memory region tag (often the same as `color_prom`) |
| `offset` | number | Byte offset to the palette index table |
| `colors_per_entry` | number | Number of colors per palette entry (e.g., 4 for 2bpp) |

## Sprite Definitions

Each entry in the `sprites` array defines one output JSON file.

### Single-Frame Sprites

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Output filename (without `.json`) |
| `index` | number | yes* | Sprite index in the ROM (for single-tile sprites) |
| `tiles` | array | yes* | Tile indices for meta-sprite composition (see below) |
| `grid` | table | no | `{cols, rows}` for meta-sprite layout. Default `{1, 1}`. |
| `palette` | number | no | Palette PROM index. Use this when the game has hardware palettes. |
| `color_map` | table | no | Pixel value remapping. Use this to map ROM pixel values to PICO-8 palette indices. |
| `transparent_pixels` | array | no | Pixel values to treat as transparent (in addition to 0, which is always transparent). |

*Provide either `index` (single tile) or `tiles` (meta-sprite). Not both.

### Multi-Frame Sprites

For animated sprites, use the `frames` array instead of `index`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Output filename |
| `frames` | array | yes | Array of frame definitions |
| `grid` | table | no | Grid dimensions shared across all frames |
| `color_map` | table | no | Default color map (frames can override) |
| `transparent_pixels` | array | no | Default transparent pixels (frames can override) |

Each frame in the `frames` array:

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | Tile index for this frame |
| `tiles` | array | Tile indices for this frame (for meta-sprites) |
| `color_map` | table | Frame-specific color map (overrides sprite-level) |
| `transparent_pixels` | array | Frame-specific transparent pixels (overrides sprite-level) |

Multi-frame sprites are automatically aligned to a unified bounding box across all frames, preventing animation jitter.

## Color Mapping

There are two ways to assign colors to extracted sprites:

### Hardware Palette (palette + color_prom)

Games with color PROMs (like Pac-Man) store colors in dedicated ROM regions. Set `palette` to the palette index and configure `color_prom` / `palette_prom` at the manifest level. The extracted JSON will include a `palette` array with the decoded hex colors.

```lua
-- Pac-Man cherry using hardware palette #20
{ name = "cherry", index = 0, palette = 20 }
```

### Color Map (PICO-8 Palette)

For games without color PROMs, or when you want precise control, use `color_map` to remap ROM pixel values to PICO-8 palette indices. The extracted JSON won't include a `palette` — the driver renders using the default PICO-8 palette.

```lua
-- NES coin: ROM pixel values 1, 2, 3 mapped to PICO-8 colors
{ name = "coin", grid = { 2, 2 },
  tiles = { 0x1A5, 0x1A6, 0x1A7, 0x1A8 },
  color_map = { [1] = 0xA, [2] = 0x4, [3] = 0xC } }
```

Pixel value 0 is always transparent. The `color_map` keys are the raw ROM pixel values (1, 2, 3 for 2bpp) and the values are PICO-8 palette indices (0x0–0xF).

## Meta-Sprite Composition

Many games build larger sprites by combining multiple tiles. Use `tiles` and `grid` to compose a meta-sprite:

```lua
-- Small Mario: 4 tiles arranged in a 2x2 grid = 16x16 pixels
{ name = "mario", grid = { 2, 2 },
  tiles = { 0x3A, 0x37, 0x4F, 0x4F },
  color_map = { [1] = 0x5, [2] = 0x9, [3] = 0x8 } }
```

Tiles are listed in row-major order (left to right, top to bottom). The special tile index `0xFC` marks a blank position that is skipped.

## Transparent Pixels

Pixel value 0 is always transparent. To make additional pixel values transparent (useful for isolating parts of a sprite), use `transparent_pixels`:

```lua
-- Ghost eyes: hide the body (pixel value 3), show only the eyes
{ name = "ghost-eyes", index = 52,
  color_map = { [1] = 0x7, [2] = 0xC },
  transparent_pixels = { 3 } }
```

## Example: Multi-Frame Animation

Pac-Man's eating animation uses three frames with different sprite indices, each sharing the same `color_map`:

```lua
{ name = "pac-right", frames = {
    { index = 44, color_map = { [3] = 0xA } },  -- open mouth
    { index = 46, color_map = { [3] = 0xA } },  -- half-open
    { index = 48, color_map = { [3] = 0xA } },  -- closed (circle)
}}
```

The transformer loads this as an animated sprite:

```javascript
const pacRight = await loadSprite('bitmaps/pac-right.json');
// pacRight.frameCount === 3
// pacRight.images has 3 frames
```

## Finding ROM Addresses

Use MAME's debugger to identify the graphics region and sprite offsets for your game:

1. Check the game's machine configuration in the [MAME source](https://github.com/mamedev/mame) for ROM region names and graphics chip details
2. Use the memory viewer to browse graphics regions and identify sprite tile layouts
3. For color PROMs, look for `.prom` region definitions in the machine driver

!!! tip
    Start by examining the MAME source for your game's driver file — it documents which ROM regions contain graphics data, color PROMs, and the tile format used by the graphics hardware.

## Next Steps

- [Bitmaps](../transformers/bitmaps.md) — Load extracted sprites in your transformer
- [Writing Interceptors](writing-interceptors.md) — Full interceptor creation guide
