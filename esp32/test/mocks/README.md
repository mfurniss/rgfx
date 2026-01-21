# Mock Headers for Native Testing

This directory contains mock implementations of ESP32/Arduino libraries for native testing.

## Purpose

These mocks allow you to run tests on your host machine (macOS, Linux, Windows) without ESP32 hardware. This enables:

- **Fast iteration** - Tests run in seconds instead of minutes
- **CI/CD integration** - Run tests in GitLab CI without hardware
- **Better debugging** - Use native debugging tools (GDB, LLDB, etc.)

## Available Mocks

### `mock_wifi.h`
Mock implementation of WiFi library
- `WiFi.macAddress()` - Returns mock MAC address "AA:BB:CC:DD:EE:FF"

### `mock_fastled.h`
Mock implementation of FastLED library
- `CRGB` struct - RGB color representation
- Named colors (Red, Green, Blue, etc.)
- `FastLED.addLeds()`, `show()`, `setBrightness()` - No-op implementations
- `fill_solid()` - Functional implementation for testing

### `mock_preferences.h`
Mock implementation of ESP32 Preferences (NVS)
- Full key/value storage using `std::map`
- String, int, bool, uint operations
- Namespace support
- Persists during test execution (not across test runs)

## Usage

Mocks are automatically activated when `UNIT_TEST` is defined (set in `platformio.ini` for native environment).

### Example Test
```cpp
#include <unity.h>

// Conditional includes based on platform
#ifdef UNIT_TEST
    #include "mocks/mock_wifi.h"
#else
    #include <WiFi.h>
#endif

void test_device_id() {
    String mac = WiFi.macAddress();  // Uses mock in native tests
    TEST_ASSERT_EQUAL_STRING("AA:BB:CC:DD:EE:FF", mac.c_str());
}
```

## Adding New Mocks

When you need to test code that depends on additional hardware libraries:

1. Create `mock_<library>.h` in this directory
2. Wrap implementation in `#ifdef UNIT_TEST`
3. Implement minimal API needed for your tests
4. Document the mock in this README

## Notes

- Mocks provide **behavior**, not **functionality**
- They simulate library APIs for testing logic, not hardware interaction
- For hardware validation, use embedded tests on real ESP32
