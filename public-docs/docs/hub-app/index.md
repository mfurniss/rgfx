# Hub App

!!! warning "Draft"
    This page is a placeholder and is under active development.

The RGFX Hub is the central desktop application that coordinates the entire RGFX system.

## What It Does

- Monitors MAME game events from interceptor scripts
- Runs an embedded MQTT broker for driver communication
- Manages connected ESP32 driver devices
- Transforms game events into LED visual effects
- Provides firmware update capabilities (USB and OTA)

## Navigation

The sidebar provides access to all Hub features:

- **System Status** - Dashboard showing system health
- **Drivers** - Connected ESP32 devices
- **Firmware** - Update ESP32 firmware
- **Games** - View configured game interceptors and transformers
- **Event Monitor** - Live event stream viewer
- **FX Playground** - Test LED effects interactively
- **Simulator** - Manually trigger events for testing
- **Settings** - Configure directories and preferences

## Next Steps

- [System Status](system-status.md) - View current system health
- [Settings](settings.md) - Configure the Hub for your setup
