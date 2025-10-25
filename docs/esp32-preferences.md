# ESP32 Preferences Library Documentation

## Overview

The Preferences library is the ESP32's replacement for Arduino's EEPROM library. It uses the ESP32's onboard Non-Volatile Storage (NVS) to store data that persists across reboots and power cycles.

**Key Characteristics:**
- Built specifically for ESP32 (part of arduino-esp32 core)
- Optimized for storing **many small values** rather than large data blocks
- Data organized into **namespaces** containing key-value pairs
- Type-safe API with native support for multiple data types
- Automatic wear leveling and data integrity checks

## Why Use Preferences Instead of EEPROM?

| Feature | EEPROM (Arduino) | Preferences (ESP32) |
|---------|------------------|---------------------|
| **Storage Model** | Byte array (manual offsets) | Key-value pairs (named) |
| **Type Safety** | None (bytes only) | Native types supported |
| **Size Management** | Fixed size declaration | Dynamic within partition |
| **Wear Leveling** | Manual | Automatic |
| **Data Integrity** | Manual CRC needed | Built-in checks |
| **Organization** | None | Namespace support |
| **API Complexity** | Low-level byte operations | High-level typed methods |

## Namespace Structure

Data is organized into **namespaces**, each containing multiple key-value pairs.

**Important Constraints:**
- **Only one namespace can be open at a time**
- Namespace names are **case-sensitive**
- Maximum namespace name length: **15 characters**
- Maximum key name length: **15 characters**
- Keys must be unique within a namespace
- Namespaces persist even after clearing their contents

**Example Namespace Structure:**
```
NVS Partition
├── "wifi" namespace
│   ├── "ssid" → "MyNetwork"
│   ├── "password" → "secret123"
│   └── "hostname" → "esp32-device"
├── "leds" namespace
│   ├── "brightness" → 64
│   ├── "dataPin" → 16
│   └── "enabled" → true
└── "devices" namespace
    ├── "count" → 3
    ├── "dev0_name" → "Marquee"
    └── "dev0_pin" → 16
```

## Supported Data Types

The Preferences library provides native support for the following data types:

| Type | Size | Put Method | Get Method |
|------|------|------------|------------|
| **Bool** | 1 byte | `putBool(key, value)` | `getBool(key, default)` |
| **Char** | 1 byte | `putChar(key, value)` | `getChar(key, default)` |
| **UChar** | 1 byte | `putUChar(key, value)` | `getUChar(key, default)` |
| **Short** | 2 bytes | `putShort(key, value)` | `getShort(key, default)` |
| **UShort** | 2 bytes | `putUShort(key, value)` | `getUShort(key, default)` |
| **Int** | 4 bytes | `putInt(key, value)` | `getInt(key, default)` |
| **UInt** | 4 bytes | `putUInt(key, value)` | `getUInt(key, default)` |
| **Long** | 4 bytes | `putLong(key, value)` | `getLong(key, default)` |
| **ULong** | 4 bytes | `putULong(key, value)` | `getULong(key, default)` |
| **Long64** | 8 bytes | `putLong64(key, value)` | `getLong64(key, default)` |
| **ULong64** | 8 bytes | `putULong64(key, value)` | `getULong64(key, default)` |
| **Float** | 4 bytes | `putFloat(key, value)` | `getFloat(key, default)` |
| **Double** | 8 bytes | `putDouble(key, value)` | `getDouble(key, default)` |
| **String** | Variable | `putString(key, value)` | `getString(key, default)` |
| **Bytes** | Variable | `putBytes(key, buffer, len)` | `getBytes(key, buffer, len)` |

## Core API Methods

### Session Management

#### `begin(name, readOnly = false, partition = NULL)`
Opens a namespace for reading/writing.

**Parameters:**
- `name` (const char*) - Namespace name (max 15 characters)
- `readOnly` (bool) - Open in read-only mode (default: false)
- `partition` (const char*) - Custom partition name (default: NULL uses "nvs")

**Returns:** `bool` - true if successful

**Example:**
```cpp
Preferences prefs;
prefs.begin("settings", false);  // Read-write mode
```

#### `end()`
Closes the currently open namespace.

**Example:**
```cpp
prefs.end();
```

### Write Operations

All `put*()` methods follow this pattern:

**Returns:** `size_t` - Number of bytes written (0 on failure)

**Behavior:**
- Automatically creates the key if it doesn't exist
- Overwrites existing value if key exists
- Requires namespace to be open in read-write mode

**Examples:**
```cpp
Preferences prefs;
prefs.begin("config", false);

prefs.putBool("enabled", true);
prefs.putInt("brightness", 64);
prefs.putString("deviceName", "ESP32-LED");
prefs.putFloat("gamma", 2.2);

prefs.end();
```

### Read Operations

All `get*()` methods support optional default values:

**Returns:** Stored value or default value if key doesn't exist or read fails

**Examples:**
```cpp
Preferences prefs;
prefs.begin("config", true);  // Read-only mode

bool enabled = prefs.getBool("enabled", false);      // Default: false
int brightness = prefs.getInt("brightness", 64);     // Default: 64
String name = prefs.getString("deviceName", "");     // Default: empty
float gamma = prefs.getFloat("gamma", 2.2);          // Default: 2.2

prefs.end();
```

### String Operations

Strings have two retrieval variants:

**Variant 1: Return Arduino String**
```cpp
String value = prefs.getString(key, defaultValue);
```

**Variant 2: Write to char buffer**
```cpp
char buffer[64];
size_t len = prefs.getString(key, buffer, sizeof(buffer));
```

### Binary Data (Bytes)

For arbitrary binary data:

**Write:**
```cpp
uint8_t data[128];
// ... fill data ...
prefs.putBytes("calibration", data, sizeof(data));
```

**Read:**
```cpp
size_t len = prefs.getBytesLength("calibration");
uint8_t data[len];
prefs.getBytes("calibration", data, len);
```

### Utility Methods

#### `clear()`
Deletes all key-value pairs in the open namespace.

**Example:**
```cpp
prefs.begin("config", false);
prefs.clear();  // Removes all keys in "config" namespace
prefs.end();
```

#### `remove(key)`
Deletes a specific key-value pair.

**Returns:** `bool` - true if key was removed

**Example:**
```cpp
prefs.begin("config", false);
prefs.remove("oldSetting");
prefs.end();
```

#### `isKey(key)`
Checks if a key exists in the namespace.

**Returns:** `bool` - true if key exists

**Example:**
```cpp
prefs.begin("config", true);
if (prefs.isKey("brightness")) {
    int value = prefs.getInt("brightness");
}
prefs.end();
```

#### `getType(key)`
Returns the data type of a stored value.

**Returns:** `PreferenceType` enum (0-10)

**Example:**
```cpp
PreferenceType type = prefs.getType("brightness");
// 0 = Invalid, 1 = Byte, 2 = Short, 3 = Int, etc.
```

#### `freeEntries()`
Returns the number of available key table entries.

**Returns:** `size_t` - Available entries

**Example:**
```cpp
size_t free = prefs.freeEntries();
log("Free NVS entries: " + String(free));
```

#### `getBytesLength(key)`
Gets the length of a Bytes-type value.

**Returns:** `size_t` - Length in bytes

**Example:**
```cpp
size_t len = prefs.getBytesLength("calibration");
```

## Usage Patterns

### Basic Read/Write Pattern

```cpp
#include <Preferences.h>

Preferences prefs;

void setup() {
    // Write values
    prefs.begin("myApp", false);
    prefs.putInt("counter", 0);
    prefs.putString("name", "ESP32");
    prefs.end();

    // Read values
    prefs.begin("myApp", true);  // Read-only
    int counter = prefs.getInt("counter", 0);
    String name = prefs.getString("name", "");
    prefs.end();
}
```

### Initialization Pattern (First Boot)

```cpp
void initializeConfig() {
    prefs.begin("config", false);

    // Check if this is first boot
    if (!prefs.isKey("initialized")) {
        // Set default values
        prefs.putBool("enabled", true);
        prefs.putInt("brightness", 64);
        prefs.putString("deviceName", "MyDevice");

        // Mark as initialized
        prefs.putBool("initialized", true);
    }

    prefs.end();
}
```

### Migration Pattern (EEPROM to NVS)

```cpp
void migrateFromEEPROM() {
    prefs.begin("config", false);

    // Check if already migrated
    if (prefs.getBool("migrated", false)) {
        prefs.end();
        return;  // Already migrated
    }

    // Read old EEPROM values
    EEPROM.begin(512);
    uint8_t brightness = EEPROM.read(0);
    uint8_t pin = EEPROM.read(1);
    EEPROM.end();

    // Write to NVS
    prefs.putUChar("brightness", brightness);
    prefs.putUChar("dataPin", pin);
    prefs.putBool("migrated", true);

    prefs.end();
}
```

### Multiple Namespace Pattern

```cpp
void manageMultipleNamespaces() {
    Preferences wifi, leds, devices;

    // Configure WiFi settings
    wifi.begin("wifi", false);
    wifi.putString("ssid", "MyNetwork");
    wifi.putString("password", "secret");
    wifi.end();

    // Configure LED settings
    leds.begin("leds", false);
    leds.putInt("brightness", 64);
    leds.putInt("pin", 16);
    leds.end();

    // Configure devices
    devices.begin("devices", false);
    devices.putInt("count", 3);
    devices.end();
}
```

### Error Handling with Defaults

```cpp
void safeReadConfig() {
    prefs.begin("config", true);

    // Use "impossible" default to detect failures
    int brightness = prefs.getInt("brightness", -1);
    if (brightness < 0 || brightness > 255) {
        // Key doesn't exist or invalid value
        brightness = 64;  // Use safe default
    }

    prefs.end();
}
```

## Best Practices

### 1. Always Close Namespaces
```cpp
// GOOD
prefs.begin("config", false);
prefs.putInt("value", 42);
prefs.end();

// BAD - resource leak
prefs.begin("config", false);
prefs.putInt("value", 42);
// Missing end()
```

### 2. Use Read-Only Mode When Possible
```cpp
// For read-only operations
prefs.begin("config", true);  // Read-only
int value = prefs.getInt("setting");
prefs.end();
```

### 3. Validate Input Before Storing
```cpp
void setBrightness(int value) {
    if (value < 1 || value > 255) {
        value = 64;  // Default
    }

    prefs.begin("leds", false);
    prefs.putInt("brightness", value);
    prefs.end();
}
```

### 4. Use Meaningful Namespace Names
```cpp
// GOOD - descriptive namespaces
prefs.begin("wifi", false);
prefs.begin("leds", false);
prefs.begin("sensors", false);

// BAD - generic names
prefs.begin("data", false);
prefs.begin("config", false);
prefs.begin("settings", false);
```

### 5. Keep Namespaces Organized
```cpp
// Organize related settings together
Namespace "leds":
  - brightness
  - dataPin
  - enabled
  - maxPower

Namespace "wifi":
  - ssid
  - password
  - hostname
```

### 6. Use Appropriate Data Types
```cpp
// GOOD - use correct types
prefs.putBool("enabled", true);        // Boolean flag
prefs.putUChar("brightness", 64);      // 0-255 value
prefs.putInt("ledCount", 100);         // Integer count
prefs.putFloat("gamma", 2.2);          // Floating point

// BAD - wrong types
prefs.putInt("enabled", 1);            // Should be Bool
prefs.putInt("brightness", 64);        // Should be UChar
prefs.putString("ledCount", "100");    // Should be Int
```

## Advanced Topics

### Factory Reset

Complete NVS erase (use with caution):

```cpp
void factoryReset() {
    // Clear specific namespace
    prefs.begin("config", false);
    prefs.clear();
    prefs.end();

    // Or use nvs_flash_erase() for complete wipe
    // (requires #include "nvs_flash.h")
    nvs_flash_erase();
    nvs_flash_init();
}
```

### Partition Configuration

Custom NVS partition in `partitions.csv`:

```csv
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x140000,
app1,     app,  ota_1,   0x150000,0x140000,
nvs_custom,data,nvs,     0x290000,0x10000,
```

Use custom partition:
```cpp
prefs.begin("config", false, "nvs_custom");
```

### Performance Considerations

- **Minimize write operations** - NVS has limited write cycles (100,000+)
- **Batch related changes** - Open namespace once, write multiple keys
- **Use read-only mode** - Faster and prevents accidental writes
- **Cache frequently read values** - Don't read from NVS in tight loops

## Common Pitfalls

### 1. Forgetting to Call end()
```cpp
// Memory leak - namespace never closed
void badExample() {
    prefs.begin("config", false);
    prefs.putInt("value", 42);
    // Missing end()
}
```

### 2. Opening Multiple Namespaces Simultaneously
```cpp
// ERROR - only one namespace can be open
Preferences prefs1, prefs2;
prefs1.begin("wifi", false);
prefs2.begin("leds", false);  // Opens new namespace, prefs1 no longer valid
```

### 3. Key Name Too Long
```cpp
// ERROR - key name exceeds 15 characters
prefs.putInt("veryLongKeyNameThatExceedsLimit", 42);
```

### 4. Not Checking for Initialization
```cpp
// GOOD - check if key exists
if (!prefs.isKey("initialized")) {
    // First boot - set defaults
}

// BAD - assumes key exists
int value = prefs.getInt("setting");  // Returns 0 if key doesn't exist
```

## References

- **Official Documentation**: https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/preferences.html
- **API Reference**: https://espressif-docs.readthedocs-hosted.com/projects/arduino-esp32/en/latest/api/preferences.html
- **Source Code**: https://github.com/espressif/arduino-esp32/tree/master/libraries/Preferences
- **ESP-IDF NVS Documentation**: https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/storage/nvs_flash.html
