# ESP32 Driver Source

This is the main source directory for the RGFX ESP32 driver firmware. The driver receives effect commands from the Hub and renders visual effects on connected LED hardware.

---

## Architecture

### Dual-Core Design

The ESP32's two cores are assigned specific responsibilities:

- **Core 0 (Protocol Core):** WiFi, MQTT, OTA updates, mDNS, config portal, OLED display, remote logging
- **Core 1 (Application Core):** LED rendering, effect processing, UDP effect listener, FastLED output

This separation ensures network operations don't block LED animations.

### Global State

Key global variables shared between cores:

- `g_driverConfig` - Current LED device configuration
- `g_configReceived` - Whether config has been received from Hub
- `g_configUpdateInProgress` - Synchronization flag during config changes
- `matrix` / `effectProcessor` - Main rendering objects (created after config received)

---

## Root-Level Files

| File | Purpose |
|------|---------|
| `main.cpp` | Entry point with `setup()` and `loop()`. Initializes all subsystems, creates FreeRTOS task for Core 0, runs LED rendering loop on Core 1. |
| `driver_config.h/cpp` | Defines `LEDDeviceConfig` and `DriverConfigData` structs. Holds global driver state including all LED device configurations. |
| `crash_handler.h/cpp` | Detects unexpected resets, stores crash info in RTC memory, reports crash details to Hub on next boot. |
| `telemetry.h/cpp` | Collects system metrics (heap usage, uptime, CPU load). Periodically sent to Hub via MQTT. |
| `log.h/cpp` | Thread-safe logging system. Uses FreeRTOS queue to pass messages from Core 1 to Core 0 for MQTT publishing. |
| `serial.h/cpp` | Serial command processor. Handles CLI commands for debugging (help, reboot, wifi, etc.). |
| `utils.h/cpp` | General utility functions. |
| `version.h` | Build version info (injected at compile time by PlatformIO). |

---

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| [config/](config/) | LED device configuration, NVS storage, WiFi portal, timing constants |
| [effects/](effects/) | Visual effect implementations (pulse, wipe, explode) and effect processor |
| [graphics/](graphics/) | Canvas rendering, Matrix abstraction, coordinate transforms, downsampling |
| [network/](network/) | MQTT, UDP, OTA updates, mDNS, broker discovery |
| [serial_commands/](serial_commands/) | Individual serial command implementations |
| oled/ | OLED display driver for status display |
| utils/ | Math utilities (easing functions, scaling) |

---

## Initialization Sequence

1. Serial port and crash handler initialization
2. NVS configuration load (WiFi credentials, driver ID)
3. Power-on LED test (if config exists in NVS)
4. WiFi connection via IotWebConf portal
5. Create FreeRTOS task for network operations on Core 0
6. Main loop waits for LED config from Hub via MQTT
7. Once config received: create Matrix, EffectProcessor, start rendering

---

## Thread Safety

- **Log queue:** Messages from Core 1 are queued and published by Core 0
- **Config updates:** `g_configUpdateInProgress` flag prevents race conditions when Matrix/EffectProcessor are being recreated
- **MQTT publishing:** Only Core 0 touches the MQTT client
- **LED rendering:** Only Core 1 touches FastLED

---

## Key Dependencies

- **FastLED** - LED strip/matrix control
- **IotWebConf** - WiFi configuration portal
- **ArduinoJson** - JSON parsing for config and effects
- **PubSubClient** - MQTT client
- **ESP32 FreeRTOS** - Dual-core task scheduling
