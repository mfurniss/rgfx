# What You'll Need

Before you begin, here's what you'll need to set up RGFX. The minimum viable setup is surprisingly simple and inexpensive.

## Software

- **RGFX package** — includes the RGFX Hub desktop app (macOS and Windows) along with MAME interceptor scripts, event transformer scripts, and ESP32 driver firmware — [download from GitHub](https://github.com/mfurniss/rgfx/releases/latest)

- **MAME** version 0.250 or later — [download from mamedev.org](https://www.mamedev.org/release.html)

## Hardware

### The Essentials

| Item | Notes |
|------|-------|
| ESP32 development board | ESP32-WROOM-32 recommended — widely available, reliable, dual-core |
| WS2812B LEDs | A strip (60 LEDs/m) or a 16x16 matrix is perfect for getting started |
| USB cable | Micro-USB or USB-C depending on your ESP32 board (make sure it's a data cable, not charge-only) |

!!! tip "RGBW LEDs (SK6812)"
    RGFX also supports SK6812 RGBW strips and matrices. These have a dedicated white LED alongside the RGB LEDs, producing cleaner whites and pastels. The tradeoff is 4 bytes per pixel instead of 3, so maximum strip length per pin is shorter. WS2812B (RGB) is the safer starting point — widely available, cheaper, and works with all effects out of the box.

That's it for a basic setup. One ESP32, some LEDs, and a USB cable to connect them to your computer.

### Optional Upgrades

- **Additional ESP32 boards** — run multiple LED strips or matrices simultaneously
- **LED matrices** — 16x16 or 32x8 flexible panels for 2D effects like bitmaps and scrolling text
- **External 5V power supply** — required for larger LED setups
- **ESP32-S3** — newer variant, also works with RGFX

For detailed hardware recommendations and wiring guidance, see [Choosing Hardware](../hardware/choosing.md) and [Wiring & Power](../hardware/wiring.md).

### Compatible ESP32 Chips

| Chip | Status |
|------|--------|
| ESP32-WROOM-32 | Recommended — widely tested, dual-core |
| ESP32-S3 | Works well — newer generation |
| ESP32-S3 Mini | Works — smaller and cheaper, but requires soldering headers |

## Next Step

[Set up RGFX Hub :material-arrow-right:](hub-setup.md)
