# Serial Commands

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains the serial command handlers for the ESP32 driver firmware. Commands are entered via the serial console for device configuration and debugging.

## Architecture

Commands are defined in the `Commands` namespace. Each command is implemented in its own `.cpp` file and registered in a lookup table in `../serial.cpp`.

### Files

| File | Description |
|------|-------------|
| `commands.h` | Header declaring all command handlers and the `CommandHandler` function signature |
| `help.cpp` | Displays available commands and usage examples |
| `reboot.cpp` | Restarts the device without erasing configuration |
| `reset.cpp` | Factory reset - erases NVS config and WiFi credentials, then reboots |
| `telemetry.cpp` | Outputs system telemetry as formatted JSON |
| `test_leds.cpp` | Toggles LED test pattern mode on/off |
| `wifi.cpp` | Sets WiFi credentials (supports quoted strings for spaces) |

## Available Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `wifi` | `wifi SSID PASSWORD` | Set WiFi credentials and restart. Supports quoted strings. |
| `reset` | `reset` | Factory reset - clears all config and restarts |
| `reboot` | `reboot` | Restart device without clearing config |
| `telemetry` | `telemetry` | Display system telemetry in JSON format |
| `test_leds` | `test_leds on\|off` | Enable/disable LED test pattern |
| `help` | `help` | Show available commands |

## Adding a New Command

1. Declare the handler in `commands.h`:
   ```cpp
   void myCommand(const String& args);
   ```

2. Create `my_command.cpp` with the implementation:
   ```cpp
   #include "commands.h"
   #include "log.h"

   namespace Commands {
       void myCommand(const String& args) {
           // Implementation
       }
   }
   ```

3. Register the command in `../serial.cpp` command lookup table.

4. Add usage info to `help.cpp`.

## Dependencies

- `log.h` - Logging utilities
- `config/config_nvs.h` - NVS configuration storage
- `config/config_portal.h` - WiFi/IotWebConf configuration
- `telemetry.h` - System telemetry collection
- `matrix.h` - LED matrix control
- `effects/effect_processor.h` - Effect management
- `network/mqtt.h` - MQTT client for test state notifications
