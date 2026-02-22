# What You'll Need

Before you begin, here's what you'll need to set up RGFX. The minimum viable setup is surprisingly simple and inexpensive.

## Software

- **RGFX package** — includes the RGFX Hub desktop app (macOS and Windows) along with MAME interceptor scripts, event transformer scripts, and ESP32 driver firmware — [download from GitHub](https://github.com/mfurniss/rgfx/releases/latest)

!!! note "macOS Gatekeeper"
    After downloading, macOS may block RGFX Hub because it is not from an identified developer. Right-click the app, select **Open**, then click **Open** in the dialog. See [FAQ](../faq.md#macos-cant-be-opened-because-apple-cannot-verify-the-developer) for details.

- **MAME** version 0.250 or later — [download from mamedev.org](https://www.mamedev.org/release.html)

## Hardware

### The Essentials

| Item | Approximate Cost | Notes |
|------|-----------------|-------|
| ESP32 development board | ~$8 | ESP32-WROOM-32 recommended — widely available, reliable, dual-core |
| WS2812B LED strip | ~$10 | A 1-meter strip (30 or 60 LEDs) is perfect for getting started |
| USB cable | ~$3 | Micro-USB or USB-C depending on your ESP32 board (make sure it's a data cable, not charge-only) |

That's it for a basic setup. One ESP32, one short LED strip, and a USB cable to connect them to your computer.

### Optional Upgrades

- **Additional ESP32 boards** — run multiple LED strips or matrices simultaneously
- **LED matrices** — 16x16 or 32x8 flexible panels for 2D effects like bitmaps and scrolling text
- **External 5V power supply** — required for larger LED setups (more than ~30 LEDs at full brightness)
- **ESP32-S3** — newer variant, also works with RGFX

For detailed hardware recommendations and wiring guidance, see [Choosing Hardware](../hardware/choosing.md) and [Wiring & Power](../hardware/wiring.md).

### Compatible ESP32 Chips

| Chip | Status |
|------|--------|
| ESP32-WROOM-32 | Recommended — widely tested, dual-core |
| ESP32-S3 | Works well — newer generation |
| ESP32-C3 Super Mini | Works — smaller and cheaper, but requires soldering headers |

## Next Step

[Set up RGFX Hub :material-arrow-right:](hub-setup.md)
