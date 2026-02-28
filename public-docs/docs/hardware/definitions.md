# Hardware Definitions

LED hardware definitions are JSON files that describe the physical properties of your LED strip or matrix. RGFX Hub ships with definitions for common hardware. You can create custom definitions for any addressable LED hardware.

## How It Works

- Hardware definitions live in the `led-hardware/` folder inside your [config directory](../getting-started/hub-setup.md#config-directory)
- Each `.json` file appears in the hardware dropdown on the [Configuration](configure.md) page
- The filename (without `.json`) becomes the identifier shown in the Hub
- Bundled definitions are installed on first launch and are never overwritten, so your custom files are safe

## File Format

Here's a complete example showing all available fields:

```json
{
  "description": "8x8 WS2812B serpentine matrix with 64 individually addressable pixels",
  "sku": null,
  "asin": "B0B775PTVF",
  "layout": "matrix-br-h-snake",
  "count": 64,
  "chipset": "WS2812B",
  "colorOrder": "GRB",
  "colorCorrection": "TypicalLEDStrip",
  "width": 8,
  "height": 8
}
```

### Required Fields

| Field    | Type             | Description                                              |
|----------|------------------|----------------------------------------------------------|
| `sku`    | string or `null` | Product SKU identifier. Use `null` for custom hardware.  |
| `layout` | string           | Physical LED arrangement. See [Layout Types](#layout-types). |
| `count`  | number           | Total number of individually addressable LEDs. Must be greater than 0. |

### Optional Fields

| Field             | Type             | Description                                              |
|-------------------|------------------|----------------------------------------------------------|
| `description`     | string           | Human-readable description of the hardware.              |
| `asin`            | string or `null` | Amazon ASIN for purchase link.                           |
| `chipset`         | string           | LED chipset type. See [Chipsets](#chipsets).              |
| `colorOrder`      | string           | Color channel order. See [Color Orders](#color-orders).  |
| `colorCorrection` | string           | Color correction profile. See [Color Correction](#color-correction). |
| `width`           | number           | Matrix width in pixels. Required for matrix layouts.     |
| `height`          | number           | Matrix height in pixels. Required for matrix layouts.    |

## Layout Types

### Strip

Use `"strip"` for any linear (1D) LED strip.

### Matrix

Matrix layout names follow the convention `matrix-{corner}-{direction}[-snake]`:

| Component   | Values | Meaning |
|-------------|--------|---------|
| **Corner**  | `tl`, `tr`, `bl`, `br` | Starting corner: top-left, top-right, bottom-left, bottom-right |
| **Direction** | `h`, `v` | Wiring runs horizontally (rows) or vertically (columns) |
| **Pattern** | _(none)_ or `-snake` | Progressive (same direction each row/column) or serpentine (alternating) |

This gives 16 matrix layouts:

| Layout | Start | Direction | Pattern |
|--------|-------|-----------|---------|
| `matrix-tl-h` | Top-left | Horizontal | Progressive |
| `matrix-tl-h-snake` | Top-left | Horizontal | Serpentine |
| `matrix-tr-h` | Top-right | Horizontal | Progressive |
| `matrix-tr-h-snake` | Top-right | Horizontal | Serpentine |
| `matrix-bl-h` | Bottom-left | Horizontal | Progressive |
| `matrix-bl-h-snake` | Bottom-left | Horizontal | Serpentine |
| `matrix-br-h` | Bottom-right | Horizontal | Progressive |
| `matrix-br-h-snake` | Bottom-right | Horizontal | Serpentine |
| `matrix-tl-v` | Top-left | Vertical | Progressive |
| `matrix-tl-v-snake` | Top-left | Vertical | Serpentine |
| `matrix-tr-v` | Top-right | Vertical | Progressive |
| `matrix-tr-v-snake` | Top-right | Vertical | Serpentine |
| `matrix-bl-v` | Bottom-left | Vertical | Progressive |
| `matrix-bl-v-snake` | Bottom-left | Vertical | Serpentine |
| `matrix-br-v` | Bottom-right | Vertical | Progressive |
| `matrix-br-v-snake` | Bottom-right | Vertical | Serpentine |

!!! tip
    Most consumer LED matrix panels use **`matrix-br-h-snake`** (bottom-right, horizontal serpentine). Check your panel's documentation if unsure.

## Chipsets

| Chipset  | Channels | Notes |
|----------|----------|-------|
| `WS2812B` | 3 (RGB) | Most common addressable LED. Default choice for most builds. Also accepts `WS2812` and `NEOPIXEL`. |
| `WS2811`  | 3 (RGB) | Similar to WS2812B, often used in 12V pixel strings. |
| `SK6812`  | 4 (RGBW) | WS2812B-compatible with added white channel. |
| `WS2814`  | 4 (RGBW) | RGBW COB strips. Uses SK6812 timing on the driver. |

## Color Orders

### RGB (3-channel)

The order in which color data is sent to each LED. If your colors look wrong (e.g., red shows as green), the color order doesn't match your hardware.

| Order | Description |
|-------|-------------|
| `GRB` | Green-Red-Blue. Default for WS2812B. |
| `RGB` | Red-Green-Blue |
| `BGR` | Blue-Green-Red |
| `RBG` | Red-Blue-Green |
| `GBR` | Green-Blue-Red |
| `BRG` | Blue-Red-Green |

### RGBW (4-channel)

For 4-channel LEDs (SK6812, WS2814), the color order includes a white channel (`W`):

`GRBW`, `RGBW`, `WRGB`, and other 4-letter permutations containing `W`.

## Color Correction

Color correction compensates for the LED's natural color bias to produce more accurate colors.

| Value | Description |
|-------|-------------|
| `TypicalLEDStrip` | Standard correction for most LED strips. |
| `Typical8mmPixel` | Correction for through-hole 8mm LED pixels. |
| `UncorrectedColor` | No correction applied. Raw color output. |

## Examples

### LED Strip

A 300-pixel WS2812B strip:

```json
{
  "description": "16.4ft (5m) WS2812B LED strip, 60 pixels/m, 300 total pixels, non-waterproof (IP30)",
  "sku": null,
  "asin": "B088FJF9XD",
  "layout": "strip",
  "count": 300,
  "chipset": "WS2812B",
  "colorOrder": "GRB"
}
```

### Matrix Panel

An 8x8 serpentine matrix:

```json
{
  "description": "8x8 WS2812B serpentine matrix with 64 individually addressable pixels",
  "sku": null,
  "asin": "B0B775PTVF",
  "layout": "matrix-br-h-snake",
  "count": 64,
  "chipset": "WS2812B",
  "colorOrder": "GRB",
  "colorCorrection": "TypicalLEDStrip",
  "width": 8,
  "height": 8
}
```

!!! note
    For matrix layouts, `width` x `height` should equal `count`.

### RGBW Strip

A 4-channel RGBW COB strip:

```json
{
  "description": "1m FCOB WS2814 RGBW LED strip, 784 LEDs/m (196 pixels), warm white 3000K, DC24V",
  "sku": null,
  "asin": null,
  "layout": "strip",
  "count": 14,
  "chipset": "WS2814",
  "colorOrder": "WRGB"
}
```

RGBW hardware unlocks additional [color mode settings](configure.md#rgbw-specific-settings) in the driver configuration.
