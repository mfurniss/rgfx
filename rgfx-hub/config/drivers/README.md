# RGFX Driver Configuration

This directory contains hardware configuration files for RGFX drivers.

## File Structure

```
config/drivers/
├── templates/              # Template configurations
│   ├── default.json       # Basic single strip template
│   └── arcade-cabinet.json # Full arcade cabinet setup
├── AB-CD-EF-12-34-56.json # Driver-specific configs (named by MAC address)
└── README.md              # This file
```

## Configuration Files

Each driver has its own JSON configuration file named after its MAC address (e.g., `AB-CD-EF-12-34-56.json`).

When a new driver connects to the Hub, the Hub will:
1. Check if a config file exists for that driver ID
2. If not, create one from the default template
3. Push the configuration to the driver via MQTT

## Configuration Schema

See `templates/default.json` for a minimal example or `templates/arcade-cabinet.json` for a complete multi-device setup.

### Key Fields

- **driver_id**: MAC address of the ESP32 (e.g., "AB-CD-EF-12-34-56")
- **friendly_name**: Human-readable name (e.g., "Cabinet-1")
- **led_devices**: Array of LED devices connected to this driver
  - **id**: Unique identifier (used in event mappings)
  - **name**: Display name
  - **pin**: GPIO pin number (16, 17, 18, etc.)
  - **type**: "strip" or "matrix"
  - **count**: Number of LEDs
  - **offset**: Starting LED index on the pin (for chaining multiple devices)
  - **chipset**: LED chipset type (default: "WS2812B")
  - **color_order**: RGB channel order (default: "GRB")
  - **max_brightness**: 0-255 brightness limit

### Matrix-Specific Fields

- **width**: Matrix width in pixels
- **height**: Matrix height in pixels
- **serpentine**: true if wired in zigzag pattern

### Global Settings

- **global_brightness_limit**: Maximum brightness across all devices
- **gamma_correction**: Gamma curve for color correction (default: 2.2)
- **dithering**: Enable temporal dithering for smoother colors
- **update_rate**: LED refresh rate in Hz (default: 60)

## Backup and Restore

To backup your driver configurations:
```bash
# Backup all configs
cp -r config/drivers/ ~/rgfx-backup/

# Restore
cp -r ~/rgfx-backup/drivers/ config/
```

## Version Control

You can track your driver configurations in git:
```bash
cd config/drivers
git init
git add .
git commit -m "Initial driver configurations"
```

## Editing Configurations

Driver configurations are managed exclusively through the RGFX Hub UI. However, you can manually edit these JSON files if needed. After editing, the Hub will push the updated configuration to the driver on next connection or when you trigger a manual sync.

**Note**: LED hardware configuration is managed by the Hub, not on the driver itself. The driver's web interface is read-only and shows the current configuration received from the Hub.
