# RGFX - Retro Game Effects

A distributed system for monitoring retro arcade game state in MAME and translating game events into synchronized LED effects across multiple ESP32-based hardware controllers.

## Overview

RGFX bridges the gap between classic arcade games running in MAME and modern LED lighting systems. It monitors game state changes (score updates, ghost behavior, power-ups, etc.) and broadcasts events that trigger coordinated LED effects on physical hardware.

### Key Features

- **Multi-Device Architecture** - Central Hub coordinates multiple ESP32 Driver devices
- **MAME Integration** - Lua scripts intercept game RAM and publish events
- **Zero Configuration** - Automatic device discovery via mDNS
- **Dual Protocol** - MQTT (QoS 2) for reliability, UDP for low-latency effects
- **Real-Time Effects** - Sub-10ms latency from game event to LED update
- **OTA Updates** - Wireless firmware updates for ESP32 devices
- **Flexible Configuration** - Multiple LED devices per Driver with custom mappings
- **Game Library** - Built-in interceptors for Pac-Man, Galaga, Super Mario Bros, and more

## Architecture

### Components

**RGFX Hub** - Electron application (TypeScript/React)
- Monitors MAME event file
- Discovers and manages ESP32 Drivers
- Maps game events to LED effects
- Provides configuration UI
- Handles firmware updates

**RGFX Driver** - ESP32 firmware (C++/Arduino)
- Controls LED hardware via FastLED
- Receives commands via MQTT and UDP
- Announces presence via mDNS
- Dual-core architecture for performance
- Persistent configuration storage

**MAME Scripts** - Lua interceptors
- Monitor game RAM addresses
- Extract game events (score, entities, power-ups)
- Write events to temporary file
- Game-specific implementations

### Communication Protocols

- **MQTT (QoS 2)** - Discovery, configuration, logging, OTA updates
- **UDP Broadcast** - Low-latency game event delivery
- **mDNS** - Zero-config device discovery

## Project Structure

```
rgfx/
├── rgfx-hub/          # Electron Hub application
│   ├── src/           # TypeScript source
│   │   ├── main.ts              # Main process
│   │   ├── mqtt.ts              # Embedded MQTT broker
│   │   ├── udp.ts               # UDP broadcaster
│   │   ├── event-file-reader.ts # MAME event monitor
│   │   ├── driver-registry.ts   # Driver management
│   │   └── renderer/            # React UI
│   └── package.json
├── esp32/             # ESP32 Driver firmware
│   ├── src/           # C++ source
│   │   ├── main.cpp             # Main firmware
│   │   ├── mqtt.cpp             # MQTT client
│   │   ├── udp.cpp              # UDP receiver
│   │   ├── effects/             # LED effects
│   │   └── config_leds.cpp      # LED configuration
│   └── platformio.ini
├── mame/              # MAME Lua scripts
│   ├── lua/
│   │   ├── rgfx.lua             # Main entry point
│   │   ├── event.lua            # Event logging
│   │   ├── ram.lua              # RAM utilities
│   │   └── interceptors/        # Game-specific scripts
│   └── launch.sh      # MAME launcher script
└── docs/              # Documentation
    ├── architecture.md          # System design
    ├── release-workflow.md      # Release process
    └── *.md                     # Library docs
```

## Getting Started

### Prerequisites

- **macOS** (primary development platform)
- **Node.js** 18+ (for Hub)
- **MAME** 0.281+ (for game emulation)
- **PlatformIO** (for ESP32 firmware)
- **ESP32 Hardware** (for physical LED control)

### Quick Start

**1. Clone the repository:**
```bash
git clone https://gitlab.com/furniss/rgfx.git
cd rgfx
```

**2. Install Hub dependencies:**
```bash
cd rgfx-hub
npm install
```

**3. Start the Hub:**
```bash
npm start
```

**4. Flash ESP32 firmware:**
```bash
cd ../esp32
pio run -t upload
```

**5. Launch MAME with RGFX:**
```bash
cd ../mame
./launch.sh pacman
```

## Supported Games

RGFX includes game interceptors for:

- **Pac-Man** (arcade)
- **Ms. Pac-Man** (arcade)
- **Galaga** (arcade)
- **Super Mario Bros** (NES)
- **Castlevania III** (NES) - In development
- **Super Mario World** (SNES) - In development

## Development

### Building the Hub

```bash
cd rgfx-hub
npm run check        # TypeScript + ESLint + tests
npm run package      # Build distributable
npm run make         # Create DMG installer
```

### Building ESP32 Firmware

```bash
cd esp32
pio run              # Compile firmware
pio run -t upload    # Upload via serial
pio test             # Run unit tests
```

### OTA Updates

Upload firmware wirelessly to configured ESP32 devices:

```bash
# Discover devices
dns-sd -B _arduino._tcp local.

# Upload to specific device
pio run -e rgfx-driver-ota -t upload --upload-port rgfx-driver-f89a58.local
```

## CI/CD

RGFX uses GitLab CI/CD with a feature branch workflow:

- **Feature branches** - All development happens here
- **Protected main branch** - Only accepts merge requests
- **Automated testing** - TypeScript, ESLint, unit tests, PlatformIO compilation
- **Artifact generation** - DMG installers, firmware binaries
- **GitLab Pages** - Firmware download hub

See [docs/release-workflow.md](docs/release-workflow.md) for details.

## Documentation

- [Architecture Overview](docs/architecture.md) - System design and protocols
- [Release Workflow](docs/release-workflow.md) - Version management and CI/CD
- [MAME Lua API](mame/docs/mame_docs/) - Extracted EPUB documentation
- [Arduino MQTT](docs/arduino-mqtt.md) - ESP32 MQTT client library
- [Aedes](docs/aedes.md) - Node.js MQTT broker
- [Zustand](docs/zustand.md) - React state management
- [ESP32 Preferences](docs/esp32-preferences.md) - NVS storage

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

See [LICENSE](LICENSE) for full license text.

### What This Means

- ✅ **Use freely** - Commercial and non-commercial use permitted
- ✅ **Modify** - Create derivatives and modifications
- ✅ **Share** - Distribute original or modified versions
- ⚠️ **Copyleft for modifications** - Modified MPL-2.0 files must remain MPL-2.0
- ✅ **Mix with proprietary** - Can combine with proprietary code (file-level copyleft only)

MPL-2.0 is a balanced copyleft license that ensures modifications to RGFX remain open source while allowing integration with other software.

## Author and Maintainer

**Matt Furniss**
Email: furniss@gmail.com
GitLab: [@furniss](https://gitlab.com/furniss)

See [MAINTAINERS.md](MAINTAINERS.md) for contribution guidelines and project governance.

## Contributing

Contributions are welcome! This project follows a feature branch workflow with automated CI/CD testing.

**To contribute:**

1. **Fork** the repository
2. **Create a feature branch** - `git checkout -b feature/my-feature`
3. **Make your changes** - Follow code quality standards (see [.claude/CLAUDE.md](.claude/CLAUDE.md))
4. **Test thoroughly** - Ensure TypeScript, ESLint, and unit tests pass
5. **Create a merge request** - CI must pass before merge
6. **Respond to feedback** - Address any review comments

### Development Standards

- **TypeScript errors** - Zero tolerance, must fix immediately
- **ESLint** - All warnings treated as errors
- **Tests** - Meaningful tests only, no shallow coverage tests
- **Code style** - Clean, readable, well-commented
- **Documentation** - Update docs for significant changes

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for comprehensive development guidelines.

## Acknowledgments

- **MAME Project** - Arcade emulation framework
- **FastLED** - High-performance LED library
- **Aedes** - Lightweight MQTT broker
- **Electron** - Cross-platform desktop framework
- **PlatformIO** - Embedded development platform

---

**Built with 💡 by the retro gaming and LED enthusiast community.**
