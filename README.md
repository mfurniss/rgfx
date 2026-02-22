# RGFX - Retro Game Effects

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](LICENSE)

Real-time LED effects driven by retro arcade games. RGFX monitors game state inside MAME and translates events like score changes, player and enemy behavior into synchronized lighting effects on ESP32-controlled LED strips and matrices.

[![RGFX Demo](https://img.youtube.com/vi/6lCLMydJWps/maxresdefault.jpg)](https://www.youtube.com/shorts/6lCLMydJWps)

## Features

- **Real-Time Effects** — Sub-10ms latency from game event to LED update
- **Multi-Device Architecture** — Central Hub coordinates multiple ESP32 Driver devices
- **MAME Integration** — Lua scripts monitor game internals and publish events
- **Zero Configuration** — Automatic device discovery via SSDP and mDNS
- **Dual Protocol** — MQTT (QoS 2) for reliability, UDP for low-latency effects
- **OTA Updates** — Wireless firmware updates for ESP32 devices
- **Flexible Configuration** — Multiple LED devices per Driver with custom mappings
- **Game Library** — Includes example code to help get setup quickly

## How It Works

RGFX is a distributed system with three components:

**RGFX Hub** — A desktop app (macOS/Windows) that monitors MAME's event output, discovers ESP32 devices on the network, and maps game events to LED effects.

**RGFX Driver** — ESP32 firmware that receives commands from the Hub and controls the connected LED hardware. Multiple Drivers can run simultaneously for multi-zone setups.

**MAME Interceptors** — Lua scripts that run inside MAME, reading game RAM to detect events like score changes, entity movement, and game state transitions. Events are written to a log file that the Hub monitors.

The Hub communicates with Drivers using MQTT (QoS 2) for configuration and reliable messaging, and UDP broadcast for low-latency game event delivery. Devices discover each other automatically — no manual IP configuration needed.

For the full architecture details, see the [documentation](https://rgfx.io/docs).

## Included examples

RGFX includes examples for the following titles:

| Game | Interceptor | Transformer |
|------|:-----------:|:-----------:|
| Defender | yes | yes |
| Galaga | yes | yes |
| Galaga '88 | yes | yes |
| OutRun | yes | yes |
| Pac-Man | yes | yes |
| Robotron: 2084 | yes | yes |
| Star Wars | yes | yes |
| Super Hang-On | yes | yes |
| Super Mario Bros (NES) | yes | yes |

See the [full game list](https://rgfx.io/hub-app/games/) for details on each game's supported events.

## Getting Started

### Prerequisites

- **macOS or Windows**
- **MAME** 0.281+
- **ESP32 hardware** with connected LED strips or matrices

### Install the RGFX Package

Download the latest installer from the [Releases](https://github.com/mfurniss/rgfx/releases/latest) page:
- **macOS** — `.dmg` installer
- **Windows** — `.exe` installer

### Launch MAME

Start MAME with the RGFX autofire script. The Hub app configures the correct MAME launch parameters — see the [Getting Started guide](https://rgfx.io/getting-started/) for details.

## Documentation

Full documentation is available at **[rgfx.io](https://rgfx.io/docs)**, covering:

- Getting started and installation
- Hub app configuration
- LED hardware setup
- Writing custom interceptors and transformers
- Architecture and protocols
- FAQ

## Development

### Hub (Electron/TypeScript)

Requires **Node.js 18+**.

```bash
cd rgfx-hub
npm install
npm start            # Development mode
npm run check        # TypeScript + ESLint + tests
npm run make         # Build installer
```

### ESP32 Driver (C++/PlatformIO)

```bash
cd esp32
pio run              # Compile
pio run -t upload    # Flash via serial
pio test             # Unit tests
```

### OTA Firmware Updates

```bash
dns-sd -B _arduino._tcp local.                                           # Discover devices
pio run -e rgfx-driver-ota -t upload --upload-port rgfx-driver-xxxx.local  # Upload
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and how to submit changes.

## Project Structure

```
rgfx/
├── rgfx-hub/              # Electron Hub application
│   ├── src/
│   │   ├── main.ts                  # Main process entry point
│   │   ├── event-file-reader.ts     # MAME event monitor
│   │   ├── driver-registry.ts       # Driver management
│   │   ├── transformer-engine.ts    # Event-to-effect transformer
│   │   ├── network/                 # MQTT and UDP modules
│   │   ├── renderer/                # React UI
│   │   └── ...
│   └── assets/
│       ├── interceptors/games/      # Bundled Lua interceptors
│       └── transformers/games/      # Bundled JS transformers
├── esp32/                 # ESP32 Driver firmware
│   ├── src/
│   │   ├── main.cpp                 # Firmware entry point
│   │   ├── effects/                 # LED effect implementations
│   │   ├── graphics/                # Matrix rendering
│   │   ├── network/                 # MQTT and UDP modules
│   │   └── ...
│   └── platformio.ini
├── esp32-installer/       # Pre-built firmware + web flasher
├── public-docs/           # Documentation site (rgfx.io)
└── scripts/               # Build and development scripts
```

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See [LICENSE](LICENSE) for full text.

- **Use freely** — Commercial and non-commercial use permitted
- **Modify** — Create derivatives and modifications
- **Share** — Distribute original or modified versions
- **Copyleft for modifications** — Modified MPL-2.0 files must remain MPL-2.0
- **Mix with proprietary** — Can combine with proprietary code (file-level copyleft only)

## Author

**Matt Furniss**
Email: furniss@gmail.com
GitHub: [@mfurniss](https://github.com/mfurniss)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and how to submit changes.

For project governance, see [MAINTAINERS.md](MAINTAINERS.md). For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Acknowledgments

- [MAME](https://www.mamedev.org/) — Arcade emulation framework
- [FastLED](https://fastled.io/) — High-performance LED library
- [Aedes](https://github.com/moscajs/aedes) — Lightweight MQTT broker
- [Electron](https://www.electronjs.org/) — Cross-platform desktop framework
- [PlatformIO](https://platformio.org/) — Embedded development platform
