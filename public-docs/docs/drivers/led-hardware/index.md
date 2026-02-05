# LED Hardware

RGFX drivers support **WS2812B** (RGB) and **SK6812** (RGBW) addressable LED strips and matrices.

## Supported LED Types

### RGB LEDs

- **WS2812B** (NeoPixel) - The most common addressable LED, default choice
- **WS2811** - Similar protocol, often used in larger installations

### RGBW LEDs

- **SK6812** - 4-channel LEDs with dedicated white channel for better color rendering

## Layout Types

### Strips

Linear 1D arrays of LEDs. Supports optional reversal to map index 0 to the last physical LED.

### Matrices

2D LED arrays with multiple wiring patterns:

- `matrix-tl-h-snake` - Top-left origin, horizontal serpentine
- `matrix-br-v-snake` - Bottom-right origin, vertical serpentine
- Other combinations of origin point, direction, and wiring pattern

## Color Orders

Different LED chipsets wire their color channels differently:

- **GRB** - Most common (WS2812B default)
- **RGB** - Standard order
- **BRG** - Some LED variants

## Multi-Panel Configurations

Multiple identical LED matrices can be combined into a single unified display:

- Configure panel grid dimensions (e.g., 2x2 for four panels)
- Specify chain order mapping for each panel position
- Per-panel rotation support (0°, 90°, 180°, 270°)

This allows effects to render seamlessly across multiple physical panels as one logical display.

View practical [examples](../examples.md) of multi-panel configurations.
