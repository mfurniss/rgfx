# Hub App

The RGFX Hub is the desktop application at the center of the system. It watches for game events from MAME, runs your transformer scripts to decide which LED effects to trigger, and sends commands to your ESP32 drivers over WiFi.

The Hub also runs an embedded MQTT message broker internally, so your ESP32 drivers can communicate without any extra software or cloud services. Everything stays on your local network.

## Features

- Monitors MAME game events from interceptor scripts
- Transforms game events into LED visual effects
- Manages connected ESP32 driver devices
- Provides firmware update capabilities (USB and OTA)
- Runs an embedded MQTT broker for driver communication

## Navigation

The sidebar provides access to all Hub features:

- **[System Status](system-status.md)** — dashboard showing system health and real-time metrics
- **[Drivers](drivers.md)** — manage connected ESP32 devices and their LED configurations
- **[Firmware](firmware.md)** — flash and update ESP32 firmware via USB or WiFi
- **[Games](games.md)** — view which ROMs have interceptors and transformers configured
- **[Event Monitor](event-monitor.md)** — watch game events streaming in real-time
- **[FX Playground](fx-playground.md)** — experiment with LED effects interactively
- **[Simulator](simulator.md)** — trigger events manually for testing without running MAME
- **[Settings](settings.md)** — configure directories and preferences
- **Help** — access this documentation
