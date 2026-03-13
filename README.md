# RGFX - Retro Game Effects

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](LICENSE)

Real-time LED effects driven by retro arcade games. RGFX monitors game state inside MAME and translates events like score changes, player and enemy behavior into synchronized lighting effects on ESP32-controlled LED strips and matrices.

[![RGFX Demo](https://img.youtube.com/vi/gh673Zi6PzE/maxresdefault.jpg)](https://youtu.be/gh673Zi6PzE)

## Features

- **Real-Time Effects** — Sub-10ms latency from game event to LED update
- **Multi-Device Architecture** — Central Hub coordinates multiple ESP32 Driver devices
- **MAME Integration** — Lua scripts monitor game internals and publish events
- **OTA Updates** — Wireless firmware updates for ESP32 devices

## Documentation

Full documentation is available at **[rgfx.io/docs](https://rgfx.io/docs)**, covering installation, configuration, hardware setup, writing custom interceptors and transformers, and architecture details.

## Downloads

Download the latest installer from the [Releases](https://github.com/mfurniss/rgfx/releases/latest) page.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and how to submit changes.

For project governance, see [MAINTAINERS.md](MAINTAINERS.md). For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Trademarks

All game titles, character names, and related properties mentioned in this project are trademarks of their respective owners. RGFX is an independent project and is not affiliated with, endorsed by, or sponsored by any game publisher or hardware manufacturer. Game names are used solely for identification and interoperability purposes.

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See [LICENSE](LICENSE) for full text.

## Author

**Matt Furniss** — [@mfurniss](https://github.com/mfurniss)

## Acknowledgments

- [MAME](https://www.mamedev.org/) — Arcade emulation framework
- [FastLED](https://fastled.io/) — High-performance LED library
- [Aedes](https://github.com/moscajs/aedes) — Lightweight MQTT broker
- [Electron](https://www.electronjs.org/) — Cross-platform desktop framework
- [PlatformIO](https://platformio.org/) — Embedded development platform
