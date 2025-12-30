# OLED Display

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Optional SSD1306 128x64 OLED status display module.

## Hardware

- **Controller**: SSD1306
- **Resolution**: 128x64 pixels
- **Interface**: I2C at 400kHz (fast mode)
- **Address**: 0x3C
- **Pins**: SDA=GPIO21, SCL=GPIO22

## Design Philosophy

- **Completely optional**: all functions are no-ops if display not detected
- **Runs on Core 0**: network core, avoids impacting LED effects on Core 1
- **Efficient updates**: only redraws changed regions, not full screen
- **State caching**: tracks SSID, IP, MQTT status to avoid redundant draws

## Files

### oled_display.h

Namespace `Display` with public API:

| Function | Purpose |
|----------|---------|
| `begin()` | Initialize display, returns false if not detected |
| `isAvailable()` | Check if display initialized |
| `showBoot(deviceName)` | Boot screen with device name and version |
| `showConnecting(ssid, deviceName)` | WiFi connection in progress |
| `showAPMode(apName)` | Setup mode screen with AP info |
| `updateAPModeCountdown(seconds)` | Countdown timer in AP mode |
| `showConnected(ssid, ip, mqtt, name)` | Main status screen |
| `updateMQTTStatus(connected)` | Update just MQTT line |
| `updateUptime(seconds)` | Update just uptime line |
| `clear()` | Clear display |

### oled_display.cpp

Implementation using Adafruit_SSD1306 library.

Key details:
- Heap allocation of display object (saves stack)
- I2C probe at startup: 100kHz for detection, then 400kHz for operation
- SSID/AP name truncation for display width (21 chars at size 1)
- Uptime formats as `HH:MM:SS` or `Xd HH:MM:SS` for long uptimes

## Screen Layouts

**Boot**: Device name + version
**Connecting**: Device name + "Connecting to:" + SSID
**AP Mode**: "SETUP MODE" + AP name + 192.168.4.1 + countdown timer
**Connected**: WiFi SSID + IP + MQTT status + Uptime
