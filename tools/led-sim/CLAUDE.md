# LED Simulator

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Native desktop application that runs ESP32 LED effect code and renders to a window using raylib. Enables rapid effect development without flashing hardware.

## Purpose

- Test and develop LED effects on macOS without physical hardware
- Use the exact same C++ effect code that runs on ESP32
- Faster iteration cycle: edit → build → run (no firmware flash needed)
- Visual debugging of effects on various LED configurations (strips, matrices)

## Building

```bash
cd tools/led-sim
mkdir -p build && cd build
cmake ..
make
```

Requires raylib installed via Homebrew: `brew install raylib`

## Usage

```bash
# Load from LED hardware config JSON (required)
./led-sim <config.json>

# Example
./led-sim ~/.rgfx/led-hardware/my-matrix.json
```

**Controls:**
- `1-4` - Trigger specific effects (pulse, wipe, explode, background)
- `C` - Clear all effects
- `D` - Toggle auto-demo mode
- `Q` / `ESC` - Quit

**UDP Input:**
The simulator listens on UDP port 8811 (same as ESP32 drivers) and receives effect commands from the Hub's Effects Playground. This allows testing effects without hardware.

## Architecture

### Hardware Abstraction Layer (HAL)

The simulator works by using a **Hardware Abstraction Layer** that allows the same effect code to run on different platforms:

```
esp32/src/                           # Shared interfaces and ESP32 code
├── hal/
│   ├── display.h                    # IDisplay interface
│   ├── platform.h                   # Timing, random, logging interfaces
│   ├── types.h                      # CRGB type definition
│   ├── esp32/                       # ESP32 implementations (FastLED, Arduino)
│   └── test/                        # Test mocks with controllable time
├── effects/                         # Effect implementations (platform-agnostic)
└── graphics/                        # Canvas, Matrix, coordinate transforms

tools/led-sim/src/                   # Simulator-specific code
├── main.cpp                         # Entry point, main loop
├── constants.h                      # Window, color, and key constants
├── raylib_compat.h                  # Raylib forward declarations
├── config.h/.cpp                    # JSON config loading
├── demo.h/.cpp                      # Demo effect triggering
├── sim_display.h/.cpp               # SimDisplay class (renders to raylib)
├── window.h/.cpp                    # Window sizing calculations
└── hal/                             # Native HAL implementations
    ├── Arduino.h                    # Arduino compatibility stub
    ├── platform.cpp                 # millis(), delay(), random() via std::chrono
    ├── log_stub.cpp                 # ESP_LOG* no-op stubs
    ├── driver_config_stub.cpp       # DriverConfig stub
    └── led_controller.cpp           # No-op ILedController (display via SimDisplay)
```

**Key HAL Interfaces:**

| Interface | ESP32 | Native |
|-----------|-------|--------|
| `hal::IDisplay` | FastLED → WS2812B | raylib window (SimDisplay) |
| `hal::ILedController` | Real FastLED operations | No-op (display via IDisplay) |
| `hal::millis()` | Arduino millis() | std::chrono |
| `hal::random()` | esp_random() | std::mt19937 |
| `hal::log()` | ESP_LOGI | printf |

### Code Flow

1. **main.cpp** loads JSON config, calculates window size, creates `Matrix` and `SimDisplay`
2. **EffectProcessor** manages active effects (same code as ESP32)
3. Effects render to a **Canvas** at 256x256 virtual resolution
4. **DownsampleToMatrix** reduces canvas to LED dimensions
5. **SimDisplay::show()** receives pixel buffer and renders via raylib

### Raylib Integration

Raylib headers conflict with ESP32 code (both define `Matrix`, `BlendMode`, etc.). The simulator avoids this by:

1. Including ESP32 headers first
2. Forward-declaring only the raylib functions needed in `raylib_compat.h`
3. Implementing `SimDisplay` separately in `sim_display.cpp`

```cpp
// raylib_compat.h - Forward declarations instead of #include <raylib.h>
extern "C" {
void InitWindow(int width, int height, const char* title);
void DrawRectangleRounded(...);
// etc.
}
```

**Color format:** Raylib uses ABGR (alpha in high byte), not RGBA:
```cpp
unsigned int color = (0xFF << 24) | (b << 16) | (g << 8) | r;
```

## Source Files

| File | Purpose |
|------|---------|
| `src/main.cpp` | Entry point, main loop |
| `src/constants.h` | Window config, key codes, color constants |
| `src/raylib_compat.h` | Raylib function forward declarations |
| `src/config.h/.cpp` | JSON hardware config loading |
| `src/demo.h/.cpp` | Demo effect triggering |
| `src/sim_display.h/.cpp` | SimDisplay class (renders pixels to raylib window) |
| `src/window.h/.cpp` | Window sizing calculations |
| `src/hal/Arduino.h` | Arduino types/macros stub for native builds |
| `src/hal/platform.cpp` | Native `hal::millis()`, `hal::delay()`, `hal::random()` |
| `src/hal/log_stub.cpp` | No-op stubs for ESP_LOG macros |
| `src/hal/driver_config_stub.cpp` | DriverConfig stub (returns defaults) |
| `src/hal/led_controller.cpp` | No-op ILedController (brightness → display) |
| `src/udp_listener.h/.cpp` | UDP socket listener for Hub effects |
| `CMakeLists.txt` | Build config, links esp32/src files and raylib |
| `.vscode/c_cpp_properties.json` | IntelliSense configuration |

## Resizable Window

The window is resizable like any standard macOS application. The LED grid dynamically scales to fit the window:

- **Initial size:** Calculated to fit LEDs at optimal size (up to 30px per LED)
- **Min window:** 400×150 (enforced via `SetWindowMinSize`)
- **LED size range:** 3-30 pixels
- **Gap:** 15% of LED size

The resize handling in `SimDisplay::show()` recalculates LED size and offsets whenever the window dimensions change, keeping the grid centered.

For a 300×1 strip: initial window is 1200×150 with 3.4px LEDs
For a 32×8 matrix: initial window is 1139×341 with 30px LEDs

## Adding New Effects

Effects are platform-agnostic. To test a new effect:

1. Implement in `esp32/src/effects/my_effect.cpp`
2. Register in `EffectProcessor::addEffect()`
3. Add to `CMakeLists.txt` ESP32_SOURCES
4. Rebuild simulator and test

## Differences from ESP32

| Aspect | ESP32 | Simulator |
|--------|-------|-----------|
| Output | WS2812B LEDs | raylib window |
| Frame rate | ~60 FPS | 120 FPS (configurable) |
| Effects | UDP port 8811 | UDP port 8811 (same) |
| MQTT | Config, OTA, telemetry | N/A |
| Config | NVS flash | Command-line args / JSON |
