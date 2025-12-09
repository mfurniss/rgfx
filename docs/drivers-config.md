# Driver Configuration

The Hub stores driver configurations in `~/.rgfx/drivers.json`. This file is created automatically when drivers connect and is updated when you configure them through the Hub UI.

## File Location

- **macOS/Linux:** `~/.rgfx/drivers.json`
- **Windows:** `%USERPROFILE%\.rgfx\drivers.json`

## Schema

```json
{
  "version": "1.0",
  "drivers": [
    {
      "id": "rgfx-driver-0001",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "description": "Living room strip",
      "ledConfig": {
        "hardwareRef": "led-hardware/btf-strip-144px-ip65.json",
        "pin": 16,
        "offset": 0,
        "globalBrightnessLimit": null,
        "dithering": true,
        "powerSupplyVolts": null,
        "maxPowerMilliamps": null,
        "unified": null
      },
      "remoteLogging": "errors",
      "wifiTxPower": 19.5
    }
  ]
}
```

## Field Reference

### Driver Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique driver ID assigned by Hub (e.g., `rgfx-driver-0001`) |
| `macAddress` | string | ESP32 MAC address used to identify the physical device |
| `description` | string | Optional user-friendly description |
| `ledConfig` | object | LED hardware and layout configuration |
| `remoteLogging` | string | Log level sent to Hub: `"off"`, `"errors"`, or `"all"` |
| `wifiTxPower` | number | WiFi transmit power in dBm (default: 19.5) |

### LED Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `hardwareRef` | string | Path to LED hardware definition file |
| `pin` | number | GPIO pin connected to LED data line |
| `offset` | number \| null | Starting LED offset for effects |
| `globalBrightnessLimit` | number \| null | Max brightness (0-255), null for no limit |
| `dithering` | boolean | Enable temporal dithering for smoother gradients |
| `powerSupplyVolts` | number \| null | Power supply voltage for power calculation |
| `maxPowerMilliamps` | number \| null | Power limit in milliamps |
| `unified` | array \| null | Matrix panel layout for multi-panel configurations |

### Unified Matrix Layout

For multi-panel matrix configurations, `unified` specifies how panels are arranged. Each inner array represents a row of panels, with panel indices indicating their position in the data chain.

Example for a 2x2 matrix arrangement:
```json
"unified": [
  [2, 3],
  [1, 0]
]
```

This creates a unified matrix from 4 panels where:
- Top row: panels 2 and 3 (left to right)
- Bottom row: panels 1 and 0 (left to right)

## LED Hardware Files

Hardware definitions are stored in `~/.rgfx/led-hardware/` and define the physical characteristics of LED strips and matrices. See [led-hardware.md](led-hardware.md) for details.
