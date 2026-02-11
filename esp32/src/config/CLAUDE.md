# Configuration System

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder manages driver configuration, persistent storage, and WiFi setup for the ESP32 driver.

---

## Files

| File | Purpose |
|------|---------|
| `config_nvs.h/cpp` | Non-volatile storage manager for persistent settings |
| `config_leds.h/cpp` | FastLED initialization from Hub configuration (LED config identified by device ID) |
| `config_portal.h/cpp` | IotWebConf WiFi configuration portal |
| `constants.h` | Global constants (ports, timing, limits) |

---

## NVS Storage (config_nvs)

[config_nvs.h](config_nvs.h) provides persistent storage using ESP32's NVS:

**Stored Values:**
- `led_config` - Full LED configuration JSON from Hub
- `device_id` - Custom driver identifier
- `log_level` - Remote logging level ("all", "errors", "off")

**Key Functions:**
```cpp
ConfigNVS::begin();                    // Initialize NVS
ConfigNVS::saveLEDConfig(json);        // Save config from MQTT
String config = ConfigNVS::loadLEDConfig();  // Load on boot
ConfigNVS::factoryReset();             // Clear all settings
```

WiFi credentials are managed separately by IotWebConf.

---

## LED Configuration (config_leds)

[config_leds.h](config_leds.h) initializes FastLED from `g_driverConfig`:

**Features:**
- Allocates LED buffers per GPIO pin
- Supports multiple devices per pin (via offset)
- Configures chipset, color order, brightness
- Maximum 4 GPIO pins (MAX_PINS constant)
- **RGBW LED support** via SK6812-based chipsets (4-byte color)

**Key Functions:**
```cpp
configLEDs();                          // Initialize FastLED from config
CRGB* leds = getLEDsForDevice("marquee");  // Get LED array by device ID
showAllLEDs();                         // Trigger FastLED output
clearAllLEDs();                        // Set all LEDs to black
```

**RGBW Notes:**
- RGBW strips use 4 bytes per pixel (R, G, B, W)
- W channel derived from color temperature or explicit setting
- Requires specific chipset configuration in hardware definition
- Configurable RGBW mode: `exact` (accurate colors with RGB active) or `max_brightness` (maximize white channel)

---

## WiFi Portal (config_portal)

[config_portal.h](config_portal.h) uses IotWebConf for WiFi configuration:

- Creates captive portal AP when WiFi not configured
- Serves web interface for entering WiFi credentials
- Stores credentials persistently
- Falls back to AP mode if connection fails

---

## Constants (constants.h)

[constants.h](constants.h) defines global configuration values:

**Network:**
- `UDP_PORT` (8888) - Effect listener port
- `MQTT_PORT` (1883) - Broker port
- `WEB_SERVER_PORT` (80) - Config portal port
- `SSDP_POLL_INTERVAL_MS` (3000) - Broker discovery interval

**Timing:**
- `WIFI_CONNECTION_TIMEOUT_MS` (10000) - WiFi connect timeout
- `AP_TIMEOUT_MS` (3000) - AP mode timeout before retry
- `TELEMETRY_INTERVAL_MS` (10000) - Heartbeat interval
- `MQTT_RECONNECT_INTERVAL_MS` (5000) - Reconnect delay

**Hardware:**
- `MAX_PINS` (4) - Maximum GPIO pins for LEDs
- `DEFAULT_MATRIX_WIDTH/HEIGHT` (8) - Default dimensions
- `DEFAULT_UPDATE_RATE` (120) - Target FPS
- `BOOT_BUTTON_PIN` (0) - GPIO for BOOT button (test mode toggle)
- `BUTTON_DEBOUNCE_MS` (50) - Button debounce time
- `DEFAULT_AP_PASSWORD` ("rgfx1234") - Default AP password for IotWebConf

---

## Configuration Flow

1. **Boot:** `nvs_flash_init()` called in main.cpp FIRST (handles fresh flash formatting)
2. **NVS Setup:** `ConfigNVS::begin()` creates namespace if needed
3. **Load:** Check for saved LED config with `hasLEDConfig()`
4. **Apply:** If config exists, parse and apply immediately
5. **WiFi:** IotWebConf handles WiFi connection/portal
6. **MQTT:** Once connected, Hub sends full config via MQTT
7. **Save:** New config saved to NVS for next boot
8. **Reinitialize:** Matrix and EffectProcessor recreated with new config

**Important:** `nvs_flash_init()` must be called before any WiFi or Preferences operations. On fresh flash, it formats the NVS partition automatically.
