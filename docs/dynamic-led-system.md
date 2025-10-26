# Dynamic LED System - Implementation Guide

## Overview

The RGFX driver now supports **dynamic FastLED initialization** based on configuration received from the Hub via MQTT. This allows runtime configuration of multiple GPIO pins, multiple LED devices per pin, strips, and matrices.

## Features

✅ **Multi-Pin Support** - Configure LEDs on multiple GPIO pins (16, 17, 18, 19, 21, 22, 23)
✅ **Multi-Device Support** - Multiple LED devices per driver (strips and matrices)
✅ **Offset Addressing** - Multiple devices can share a single pin with different offsets
✅ **Matrix Support** - Configure width, height, serpentine patterns
✅ **Runtime Configuration** - No recompilation needed for hardware changes
✅ **Automatic LED Allocation** - Driver allocates buffers based on config
✅ **Visual Confirmation** - White flash on successful configuration

## Architecture

### Configuration Flow

```
Hub Config (JSON)
    ↓
MQTT (QoS 2)
    ↓
ESP32 receives config
    ↓
handleDriverConfig() parses JSON
    ↓
Populates g_driverConfig (global struct)
    ↓
initializeDynamicLEDs() called
    ↓
Allocates LED buffers per pin
    ↓
Calls FastLED.addLeds() for each pin
    ↓
Creates device mappings
    ↓
Applies global settings (brightness, etc.)
    ↓
Visual confirmation (white flash)
    ↓
LEDs ready for use
```

### Data Structures

#### `LEDDeviceConfig` (driver_config.h)

Represents a single LED device:

```cpp
struct LEDDeviceConfig {
    String id;              // Device ID (e.g., "marquee")
    String name;            // Display name
    uint8_t pin;            // GPIO pin number
    String type;            // "strip" or "matrix"
    uint16_t count;         // Number of LEDs
    uint16_t offset;        // Offset on pin
    String chipset;         // "WS2812B", etc.
    String colorOrder;      // "GRB", "RGB", etc.
    uint8_t maxBrightness;  // 0-255 limit

    // Matrix-specific
    uint8_t width;          // Matrix width
    uint8_t height;         // Matrix height
    bool serpentine;        // Serpentine wiring
};
```

#### `DriverConfigData` (driver_config.h)

Complete driver configuration:

```cpp
struct DriverConfigData {
    String driverId;                        // MAC address
    String friendlyName;                    // Human name
    std::vector<LEDDeviceConfig> devices;   // All LED devices

    // Global settings
    uint8_t globalBrightnessLimit;
    float gammaCorrection;
    bool dithering;
    uint8_t updateRate;
};
```

#### Global Variables

```cpp
extern DriverConfigData g_driverConfig;  // Configuration received from Hub
extern bool g_configReceived;             // Flag indicating config received
```

### Dynamic LED Manager (dynamic_leds.cpp)

#### Initialization

```cpp
bool initializeDynamicLEDs();
```

**What it does:**
1. Validates `g_driverConfig` is populated
2. Groups devices by GPIO pin
3. Calculates total LEDs needed per pin
4. Allocates `CRGB` buffers for each pin
5. Calls `FastLED.addLeds<WS2812B, PIN, GRB>()` for each pin
6. Creates device-to-buffer mappings
7. Applies global brightness and power limits
8. Returns `true` on success

**Limitations:**
- Maximum 4 GPIO pins supported (`MAX_PINS`)
- Maximum 300 LEDs per pin (`MAX_LEDS_PER_PIN`)
- Supported pins: 16, 17, 18, 19, 21, 22, 23
- All LEDs must use WS2812B chipset
- Color order is GRB (hardcoded currently)

#### Device Access

```cpp
CRGB* getLEDsForDevice(const String& deviceId);
uint16_t getLEDCountForDevice(const String& deviceId);
```

**Usage:**
```cpp
// Get LEDs for a specific device
CRGB* marquee = getLEDsForDevice("marquee");
uint16_t count = getLEDCountForDevice("marquee");

// Use the LEDs
if (marquee) {
    fill_solid(marquee, count, CRGB::Red);
    showAllLEDs();
}
```

#### Global Operations

```cpp
void showAllLEDs();    // Call FastLED.show()
void clearAllLEDs();   // Set all to black and show
```

## Example Configurations

### Single Strip

```json
{
  "led_devices": [
    {
      "id": "strip1",
      "name": "LED Strip 1",
      "pin": 16,
      "type": "strip",
      "count": 100,
      "offset": 0
    }
  ]
}
```

**Result:**
- Pin 16: 100 LEDs allocated
- `getLEDsForDevice("strip1")` → pointer to 100-LED array

### Multiple Devices on One Pin

```json
{
  "led_devices": [
    {
      "id": "marquee",
      "name": "Marquee",
      "pin": 16,
      "type": "strip",
      "count": 100,
      "offset": 0
    },
    {
      "id": "coin_slot",
      "name": "Coin Slot Matrix",
      "pin": 16,
      "type": "matrix",
      "count": 64,
      "offset": 100,
      "width": 8,
      "height": 8,
      "serpentine": true
    }
  ]
}
```

**Result:**
- Pin 16: 164 LEDs allocated (100 + 64)
- `getLEDsForDevice("marquee")` → pointer to first 100 LEDs
- `getLEDsForDevice("coin_slot")` → pointer to LEDs 100-163

### Multiple Pins

```json
{
  "led_devices": [
    {
      "id": "marquee",
      "pin": 16,
      "count": 100,
      "offset": 0
    },
    {
      "id": "p1_buttons",
      "pin": 17,
      "count": 20,
      "offset": 0
    },
    {
      "id": "p2_buttons",
      "pin": 18,
      "count": 20,
      "offset": 0
    }
  ]
}
```

**Result:**
- Pin 16: 100 LEDs
- Pin 17: 20 LEDs
- Pin 18: 20 LEDs
- Total: 140 LEDs across 3 pins

## Implementation Details

### FastLED Template Limitation Workaround

FastLED requires compile-time pin specification:

```cpp
FastLED.addLeds<WS2812B, 16, GRB>(leds, count);  // Pin 16 hardcoded
```

**Solution:** Switch statement with hardcoded cases for supported pins:

```cpp
switch (pin) {
    case 16:
        FastLED.addLeds<WS2812B, 16, GRB>(ledBuffers[pinIndex], count);
        break;
    case 17:
        FastLED.addLeds<WS2812B, 17, GRB>(ledBuffers[pinIndex], count);
        break;
    // ... etc for all supported pins
    default:
        log("ERROR: Unsupported GPIO pin");
        return false;
}
```

### Memory Management

**LED Buffer Allocation:**
```cpp
ledBuffers[pinIndex] = new CRGB[count];
```

**Memory Usage Example:**
- 100 LEDs = 100 * 3 bytes = 300 bytes (RGB)
- 300 LEDs (max per pin) = 900 bytes
- 4 pins * 900 bytes = 3.6 KB maximum

**ESP32 has 320KB RAM** - LED buffers use minimal memory.

### Device Mapping

Internal mapping from device ID to LED buffer location:

```cpp
struct DeviceMapping {
    String id;          // Device ID
    uint8_t pinIndex;   // Index into ledBuffers array
    uint16_t offset;    // Offset within buffer
    uint16_t count;     // LED count
};
```

**Lookup is O(n)** where n = number of devices (typically < 10).

## Matrix Support

### Configuration

```json
{
  "id": "matrix1",
  "type": "matrix",
  "pin": 16,
  "width": 8,
  "height": 8,
  "count": 64,
  "serpentine": true
}
```

### Serpentine Layout

Standard matrix wiring (rows alternate direction):

```
0  1  2  3  4  5  6  7
15 14 13 12 11 10 9  8
16 17 18 19 20 21 22 23
31 30 29 28 27 26 25 24
...
```

**Current Status:** Configuration is stored, but XY mapping not yet implemented.

**TODO:**
- Implement `XY(x, y)` coordinate mapping
- Support serpentine patterns
- Matrix helper functions

## Troubleshooting

### "ERROR: Unsupported GPIO pin"

**Cause:** Pin number not in supported list.

**Supported Pins:** 16, 17, 18, 19, 21, 22, 23

**Solution:** Use a supported pin or add the pin to the switch statement in `dynamic_leds.cpp`.

### "ERROR: Too many LEDs on pin"

**Cause:** Device configuration exceeds `MAX_LEDS_PER_PIN` (300).

**Solution:**
- Reduce LED count
- Split across multiple pins
- Increase `MAX_LEDS_PER_PIN` (requires more RAM)

### "ERROR: Too many pins configured"

**Cause:** Configuration uses more than `MAX_PINS` (4).

**Solution:**
- Consolidate devices onto fewer pins
- Increase `MAX_PINS` (requires more RAM)

### LEDs Not Working

**Check:**
1. Serial console for initialization messages
2. Config received: "Configuration will be applied on next LED initialization"
3. White flash occurred (indicates success)
4. Wiring: Data pin matches configured pin
5. Power: Adequate power supply for LED count

## Usage Example

### In Main Code

```cpp
// After config received and LEDs initialized:

// Get device LEDs
CRGB* marquee = getLEDsForDevice("marquee");
uint16_t marqueeCount = getLEDCountForDevice("marquee");

CRGB* buttons = getLEDsForDevice("p1_buttons");
uint16_t buttonCount = getLEDCountForDevice("p1_buttons");

// Set colors
if (marquee) {
    fill_solid(marquee, marqueeCount, CRGB::Blue);
}

if (buttons) {
    fill_solid(buttons, buttonCount, CRGB::Red);
}

// Show changes
showAllLEDs();
```

### Effects on Specific Devices

```cpp
void pulseEffect(const String& deviceId, uint32_t color) {
    CRGB* leds = getLEDsForDevice(deviceId);
    uint16_t count = getLEDCountForDevice(deviceId);

    if (!leds) {
        log("Device not found: " + deviceId);
        return;
    }

    // Fill with color
    fill_solid(leds, count, CRGB(color));
    showAllLEDs();
    delay(250);

    // Fade to black
    fadeToBlackBy(leds, count, 100);
    showAllLEDs();
}
```

## Future Enhancements

### Planned

1. **Matrix XY Mapping**
   - `uint16_t XY(uint8_t x, uint8_t y, const String& deviceId)`
   - Serpentine support
   - Custom layouts

2. **Color Order per Device**
   - Currently hardcoded to GRB
   - Support RGB, BGR, etc. per device

3. **Multiple Chipsets**
   - Support WS2811, APA102, SK6812
   - Per-device chipset configuration

4. **More GPIO Pins**
   - Add more pins to switch statement
   - Support all usable ESP32 GPIOs

5. **Power Management**
   - Calculate power consumption
   - Warn if exceeding limits
   - Auto-brightness limiting

### Deferred

- Irregular matrix layouts
- Non-contiguous LED strips
- Dynamic pin assignment (impossible with FastLED templates)

## Performance

**Initialization Time:** ~50-200ms depending on device count

**Memory Overhead:** Minimal
- Configuration struct: ~100 bytes per device
- Mapping table: ~20 bytes per device
- LED buffers: 3 bytes per LED

**Runtime Performance:**
- Device lookup: O(n) where n = device count
- LED updates: Same as standard FastLED
- No performance penalty for multi-device setup

## Conclusion

The dynamic LED system successfully implements runtime configuration of FastLED based on Hub-provided settings. It supports multi-pin, multi-device setups with strips and matrices, all configurable without firmware recompilation.

This enables the full RGFX architecture where the Hub centrally manages all driver configurations, making the system flexible and user-friendly.

---

**Files:**
- `driver_config.h/cpp` - Configuration data structures
- `dynamic_leds.h/cpp` - Dynamic FastLED manager
- `mqtt_config_handler.cpp` - MQTT config receiver
