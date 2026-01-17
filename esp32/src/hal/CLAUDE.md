# Hardware Abstraction Layer (HAL)

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains interfaces and implementations that abstract hardware-specific functionality, enabling the same effect code to run on ESP32, native simulator, and tests.

## Architecture

```
hal/
├── display.h           # IDisplay interface - output rendering
├── led_controller.h    # ILedController interface - FastLED abstraction
├── platform.h          # Platform utilities (millis, etc.)
├── types.h             # CRGB, CHSV, fill_solid, RGB/HSV conversion (FastLED types for non-ESP32)
├── esp32/              # ESP32 implementations
│   ├── display.cpp     # FastLED.show() wrapper
│   ├── led_controller.cpp  # Real FastLED operations
│   └── platform.cpp
└── test/               # Headless test implementations
    ├── display.cpp     # Frame capture for assertions
    ├── led_controller.cpp  # Counter-based mock
    └── platform.cpp
```

## Interfaces

### IDisplay
Abstracts the final pixel output:
- `show(pixels, count, width, height)` - Present pixel buffer
- `setBrightness(brightness)` - Set global brightness
- `shouldQuit()` - Check for window close (native only)

### ILedController
Abstracts FastLED global operations:
- `show()` - Display LED buffer (FastLED.show() on ESP32)
- `clear(writeData)` - Clear all LEDs
- `setBrightness(brightness)` - Set global brightness
- `setMaxPower(volts, milliamps)` - Power limit (ESP32-only)
- `setDither(enabled)` - Temporal dithering (ESP32-only)

Note: `FastLED.addLeds<>()` is NOT abstracted - it's a template function requiring hardware-specific configuration and only runs on ESP32.

## Usage

```cpp
#include "hal/led_controller.h"
#include "hal/display.h"

// Use via global accessor functions
hal::getLedController().show();
hal::getLedController().setBrightness(128);
hal::getDisplay().show(pixels, count, width, height);
```

## Platform-Specific Implementations

### ESP32 (`esp32/`)
- Uses real FastLED library
- Hardware LED output via RMT peripheral
- Power limiting and dithering supported

### Native/Simulator (`tools/led-sim/src/hal/`)
- `led_controller.cpp` - No-ops (display handled by IDisplay)
- `sim_display.cpp` - Raylib window rendering

### Test (`test/`)
- `led_controller.cpp` - Counters for assertions
- `display.cpp` - Frame capture for pixel verification

## types.h Color Functions

The types.h file includes RGB/HSV conversion functions for non-ESP32 builds:
- `rgb2hsv_approximate(CRGB)` - Convert RGB to HSV
- `hsv2rgb_rainbow(CHSV)` - Convert HSV to RGB with rainbow hue mapping

## PSRAM Functions

Platform functions for bitmap memory management:
- `psramAvailable()` - Check if PSRAM is present
- `psramMalloc(size)` - Allocate from PSRAM (falls back to regular heap)
- Used by bitmap effect for storing sprite data
