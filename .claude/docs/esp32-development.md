# ESP32 Development

## Dual-Core Architecture

**CRITICAL - DUAL-CORE ARCHITECTURE:**

- **Core 0 (Protocol Core)**: Network tasks - MQTT, WiFi, web server, OTA, OLED display (10ms cycle)
- **Core 1 (Application Core)**: LED effects and UDP processing (time-critical)

**IMPORTANT**: Display updates run on Core 0 and have **ZERO impact** on LED performance (Core 1).

## Build and Deployment Workflow

**CRITICAL - BUILD AND DEPLOYMENT WORKFLOW:**

When modifying ESP32 code:
1. **Build firmware**: `pio run --project-dir /Users/matt/Workspace/rgfx/esp32`
2. **Check for compilation errors** and fix immediately
3. **Deploy to Hub** (when ready): `npm run esp32:copy-firmware` (from project root)
   - Copies firmware binaries from `esp32/.pio/build/` to `rgfx-hub/public/esp32/firmware/`
   - Creates both `firmware.bin` (for USB serial flash) and `rgfx-firmware.{version}.bin` (for OTA)
   - Generates `manifest.json` with SHA256 checksums for USB serial flashing
   - Hub automatically detects new firmware via file watcher
   - Driver cards will show "Update Available" badges immediately
4. **Never leave code in a non-compiling state**

## Firmware Deployment Details

- **USB Serial Flash**: Uses `firmware.bin` + `manifest.json` (auto-generated with SHA256 checksums)
- **OTA Flash**: Uses versioned filename `rgfx-firmware.{version}.bin` detected by FirmwareVersionService
- Both methods deploy **identical firmware** (same SHA256 hash)
- Manifest generation ensures USB flash always uses latest firmware matching current build

## Why Separate Build and Deploy

- Build compiles to `esp32/.pio/build/` directory
- Deploy is explicit and atomic - no premature detection
- Hub watches `rgfx-hub/public/esp32/firmware/` for completed firmware
- File watcher triggers immediately on copy (no debounce, no guessing)

## Upload and Monitor Workflow

**CRITICAL - Upload and Monitor Workflow:**
- **Claude will only compile**
- **User handles upload and monitoring** - Use VSCode tasks or manual commands
- **NEVER try to automate serial port access** - Causes blocking and port locking

## Over-The-Air (OTA) Firmware Updates

**OTA updates are fully configured and working!**

**How OTA Works:**
- Each driver advertises with unique hostname: `rgfx-driver-<device-id>`
- ArduinoOTA service runs on each driver
- Updates happen on Core 0 without blocking LED operations

**To upload firmware via OTA:**

```bash
# Discover devices
dns-sd -B _arduino._tcp local.

# Upload to specific device
pio run -e rgfx-driver-ota -t upload --upload-port rgfx-driver-0001.local
```

**OTA Upload Process:**
- Driver LEDs turn **ORANGE** when update starts
- LEDs turn **GREEN** when complete
- LEDs turn **RED** if failed
- Driver automatically restarts after success
