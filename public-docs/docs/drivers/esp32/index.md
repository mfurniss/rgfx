# ESP32 Firmware

The RGFX driver firmware runs on ESP32 microcontrollers and controls connected LED hardware.

## Supported Chips

RGFX provides pre-built firmware for the following ESP32 variants:

| Chip | Description |
|------|-------------|
| **ESP32-WROOM-32** | Original ESP32, dual-core, widely available |
| **ESP32-S3** | Newer generation ESP32 |

Each chip type has its own firmware binary. The Hub automatically detects the chip type and selects the correct firmware for OTA updates.

## Development Boards

Any ESP32 development board using a supported chip should work. Common options include:

- ESP32 DevKit v1 (WROOM-32)
- ESP32-S3 DevKitC
- NodeMCU-32S
- Wemos D1 Mini ESP32
