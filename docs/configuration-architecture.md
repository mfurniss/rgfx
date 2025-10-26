# RGFX Configuration Architecture

## Overview

RGFX uses a **Hub-centralized configuration** architecture. All driver LED hardware configuration is managed by the Hub and pushed to drivers via MQTT. This provides a single source of truth and eliminates configuration drift.

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│                    HUB                          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Driver Configuration (JSON Files)        │  │
│  │ /config/drivers/                         │  │
│  │   ├── AB-CD-EF-12-34-56.json            │  │
│  │   ├── AB-CD-EF-78-90-AB.json            │  │
│  │   └── templates/                         │  │
│  │       ├── default.json                   │  │
│  │       └── arcade-cabinet.json            │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Manages:                                       │
│  • LED hardware definitions                    │
│  • Pin assignments                             │
│  • Device names and types                      │
│  • Matrix configurations                       │
│  • Brightness limits                           │
│                                                 │
└───────────────┬─────────────────────────────────┘
                │
                │ MQTT QoS 2
                │ rgfx/driver/{driver_id}/config
                ↓
┌───────────────────────────────────────────────────┐
│                 DRIVER (ESP32)                    │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ Minimal NVS Storage                        │  │
│  │ • WiFi credentials (IotWebConf)            │  │
│  │ • Migration marker                         │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  Runtime (RAM only):                              │
│  • Receives config from Hub via MQTT              │
│  • Operates with Hub-provided configuration       │
│  • Falls back to safe defaults if no Hub config   │
│                                                   │
│  Web Interface (Read-Only):                       │
│  • WiFi settings (editable)                       │
│  • System information (read-only)                 │
│  • LED config display (read-only)                 │
│                                                   │
└───────────────────────────────────────────────────┘
```

## Configuration Flow

### 1. Driver Boot Sequence

```
1. Driver powers on
2. Loads WiFi credentials from NVS (managed by IotWebConf)
3. Connects to WiFi
4. Discovers Hub via mDNS
5. Connects to Hub MQTT broker
6. Subscribes to: rgfx/driver/{MAC_ADDRESS}/config
7. Sends driver announce message: rgfx/system/driver/connect
8. Waits for configuration from Hub
```

### 2. Hub Response Sequence

```
1. Hub receives driver announce on rgfx/system/driver/connect
2. Extracts driver MAC address from announce payload
3. Checks if config exists: config/drivers/{MAC_ADDRESS}.json
4. If not exists: Creates from default template
5. Loads config file
6. Publishes config to: rgfx/driver/{MAC_ADDRESS}/config (QoS 2)
7. Driver receives and validates config
8. Driver logs config details (TODO: applies config to FastLED)
```

### 3. Configuration Updates

When Hub config changes:
```
1. User modifies config in Hub UI (or edits JSON file)
2. Hub validates changes
3. Hub saves to config/drivers/{MAC_ADDRESS}.json
4. Hub publishes updated config to driver via MQTT (QoS 2)
5. Driver receives and applies new config (runtime, no reboot needed)
```

## Driver Configuration Format

Each driver has a JSON configuration file in the Hub:

**Location:** `rgfx-hub/config/drivers/{MAC-ADDRESS}.json`

**Example:** `AB-CD-EF-12-34-56.json`

```json
{
  "driver_id": "AB-CD-EF-12-34-56",
  "friendly_name": "Cabinet-1",
  "description": "Main arcade cabinet marquee and buttons",
  "version": "1.0",
  "last_updated": "2024-10-25T14:30:00Z",

  "led_devices": [
    {
      "id": "marquee",
      "name": "Marquee",
      "pin": 16,
      "type": "strip",
      "count": 100,
      "offset": 0,
      "chipset": "WS2812B",
      "color_order": "GRB",
      "max_brightness": 200
    },
    {
      "id": "coin_slot",
      "name": "Coin Slot",
      "pin": 16,
      "type": "matrix",
      "count": 64,
      "offset": 100,
      "width": 8,
      "height": 8,
      "serpentine": true,
      "chipset": "WS2812B",
      "color_order": "GRB",
      "max_brightness": 128
    }
  ],

  "settings": {
    "global_brightness_limit": 200,
    "gamma_correction": 2.2,
    "dithering": true,
    "update_rate": 60
  }
}
```

### Field Descriptions

#### Top-Level Fields

- **driver_id** (required): MAC address in format `AB-CD-EF-12-34-56`
- **friendly_name**: Human-readable name (e.g., "Cabinet-1")
- **description**: Optional description
- **version**: Schema version (currently "1.0")
- **last_updated**: ISO 8601 timestamp of last modification

#### LED Device Fields

- **id** (required): Unique identifier (lowercase, alphanumeric + underscore)
- **name** (required): Display name
- **pin** (required): GPIO pin number (0-39)
- **type** (required): "strip" or "matrix"
- **count** (required): Total number of LEDs
- **offset**: Starting LED index on pin (default: 0)
- **chipset**: LED chipset type (default: "WS2812B")
- **color_order**: RGB channel order (default: "GRB")
- **max_brightness**: 0-255 brightness limit (default: 255)

#### Matrix-Specific Fields

- **width**: Matrix width in pixels (required for matrices)
- **height**: Matrix height in pixels (required for matrices)
- **serpentine**: Zigzag wiring pattern (default: false)

#### Global Settings

- **global_brightness_limit**: Maximum brightness across all devices (0-255)
- **gamma_correction**: Gamma curve value (1.0-3.0, default: 2.2)
- **dithering**: Enable temporal dithering (default: true)
- **update_rate**: LED refresh rate in Hz (30-120, default: 60)

## MQTT Topics

### Driver Announce

**Topic:** `rgfx/system/driver/connect`
**Direction:** Driver → Hub
**QoS:** 2 (exactly once)
**Payload:** JSON with driver system information

```json
{
  "id": "AB-CD-EF-12-34-56",
  "network": {
    "hostname": "rgfx-driver",
    "ip": "192.168.1.42",
    "mac": "AB:CD:EF:12:34:56",
    "rssi": -67
  },
  "chip": {
    "model": "ESP32",
    "cores": 2,
    "revision": 1
  },
  "memory": {
    "ram_total": 327680,
    "ram_free": 276880,
    "flash_size": 4194304
  },
  "led": {
    "count": 100,
    "pin": 16,
    "brightness": 64,
    "chipset": "WS2812B",
    "colorOrder": "GRB"
  }
}
```

### Driver Configuration

**Topic:** `rgfx/driver/{MAC_ADDRESS}/config`
**Direction:** Hub → Driver
**QoS:** 2 (exactly once)
**Payload:** Complete driver configuration JSON

The Hub publishes the full configuration JSON to this topic when:
- Driver first connects
- Configuration is manually updated
- Hub requests a sync

### Discovery Ping

**Topic:** `rgfx/system/discover`
**Direction:** Hub → All Drivers
**QoS:** 2
**Payload:** Empty or "ping"

Drivers respond by sending their announce message to `rgfx/system/driver/connect`.

## Backup and Restore

### Backup

All driver configurations are in JSON files:

```bash
# Backup all configs
cp -r rgfx-hub/config/drivers/ ~/rgfx-backup/

# Or create a tarball
tar -czf rgfx-config-backup.tar.gz rgfx-hub/config/drivers/
```

### Restore

```bash
# Restore all configs
cp -r ~/rgfx-backup/drivers/ rgfx-hub/config/

# Or extract tarball
tar -xzf rgfx-config-backup.tar.gz -C rgfx-hub/config/
```

### Version Control

Configuration files are plain JSON and work well with git:

```bash
cd rgfx-hub/config
git init
git add .
git commit -m "Initial driver configurations"
```

## Migration from Old Firmware

Drivers upgrading from older firmware (with NVS-stored LED config):

1. Old firmware stored brightness and data pin in NVS
2. New firmware ignores these values
3. On first boot, NVS migration marker is set
4. Driver requests config from Hub
5. Hub creates config from default template if none exists
6. Driver operates with Hub-provided config

**Note:** Old NVS values are not migrated to Hub. Users must configure via Hub UI.

## Troubleshooting

### Driver Shows Default Values

**Symptoms:**
- Driver web interface shows default brightness (64)
- Driver web interface shows default pin (16)

**Causes:**
1. Driver hasn't received config from Hub yet
2. Hub isn't running
3. MQTT connection failed
4. Config file missing/invalid on Hub

**Solutions:**
- Check driver serial console for config messages
- Verify Hub is running and MQTT broker is active
- Check Hub logs for config push messages
- Verify config file exists: `rgfx-hub/config/drivers/{MAC}.json`

### Config Not Applying

**Symptoms:**
- Driver receives config (visible in logs)
- LEDs still use old behavior

**Cause:**
- Config application not fully implemented yet (TODO)

**Current Status:**
- Driver receives and validates config
- Config is logged to serial console
- Actual FastLED configuration update is TODO

## Future Enhancements

### Planned Features

1. **Dynamic FastLED Reconfiguration**
   - Apply config changes without reboot
   - Support multiple pins and devices
   - Runtime FastLED template instantiation

2. **Config Validation**
   - Hub validates JSON before saving
   - Driver validates received config
   - Schema version compatibility checking

3. **Hub UI for Configuration**
   - Graphical editor for driver configs
   - Device templates and presets
   - Real-time config preview

4. **Config Sync Status**
   - Track which drivers have latest config
   - Manual sync trigger
   - Config version tracking

## Benefits of Hub-Centralized Config

✅ **Single Source of Truth** - All config in one place
✅ **No ESP32 Storage Limits** - Unlimited config complexity
✅ **Easy Backup/Restore** - Simple file copy
✅ **Version Control** - Track changes in git
✅ **Bulk Updates** - Update multiple drivers at once
✅ **A/B Testing** - Swap configs easily
✅ **User-Friendly** - Configure everything in Hub UI

## Security Considerations

- Config contains no secrets (only hardware definitions)
- MQTT uses QoS 2 for reliable delivery
- Driver validates config before applying
- Invalid configs are logged but don't crash driver
- Driver falls back to safe defaults on error

## Related Documentation

- [Architecture Overview](architecture.md) - System design
- [MQTT Documentation](aedes.md) - MQTT broker details
- [Driver README](../esp32/README.md) - ESP32 firmware details
