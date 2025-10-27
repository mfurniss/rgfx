# ESP32 OTA (Over-The-Air) Updates

Comprehensive documentation for OTA firmware updates on ESP32 devices, including ArduinoOTA and the espota protocol.

**Last Updated:** 2025-01-26
**Sources:**
- [Espressif ESP-IDF OTA Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [ESP8266/ESP32 Arduino OTA Documentation](https://github.com/esp8266/Arduino/blob/master/doc/ota_updates/readme.rst)
- [espota.py Source Code](https://github.com/espressif/arduino-esp32/blob/master/tools/espota.py)

---

## Table of Contents

1. [Overview](#overview)
2. [ArduinoOTA Library](#arduinoota-library)
3. [espota.py Protocol](#espotapy-protocol)
4. [ESP32 OTA Architecture](#esp32-ota-architecture)
5. [Security](#security)
6. [Troubleshooting](#troubleshooting)

---

## Overview

OTA (Over-The-Air) updates enable ESP32 devices to receive firmware updates wirelessly via WiFi, eliminating the need for physical USB/serial connections. This is essential for deployed devices that are difficult to access physically.

**Key Benefits:**
- Remote firmware updates without physical access
- Reduced deployment costs and maintenance time
- Field updates for bug fixes and new features
- Configuration preservation (via NVS storage)

**Requirements:**
- ESP32 must be connected to WiFi
- Sufficient flash memory for dual firmware storage (current + new)
- OTA-capable firmware running on device
- Network connectivity between updater and device

---

## ArduinoOTA Library

### Basic Usage

The ArduinoOTA library provides a simple API for enabling OTA updates on ESP32 devices.

**Minimal Setup:**

```cpp
#include <WiFi.h>
#include <ArduinoOTA.h>

void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    delay(5000);
    ESP.restart();
  }

  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();
}
```

### Configuration Methods

**Security & Identification:**
- `setPort(port)` - Set OTA port (default: 8266 for ESP8266, 3232 for ESP32)
- `setHostname(hostname)` - Set device hostname for network identification
- `setPassword(password)` - Set password for authenticated updates
- `setPasswordHash(hash)` - Use pre-computed password hash

**Callback Handlers:**
- `onStart(callback)` - Called when OTA update begins
- `onEnd(callback)` - Called when update completes
- `onProgress(callback)` - Called during upload with progress info
- `onError(callback)` - Called on error with error code

### Example with Callbacks

```cpp
ArduinoOTA.setHostname("rgfx-driver-f89a58");
ArduinoOTA.setPassword("my-secure-password");

ArduinoOTA.onStart([]() {
  Serial.println("OTA Update starting...");
  // Turn LEDs orange to indicate update in progress
});

ArduinoOTA.onEnd([]() {
  Serial.println("OTA Update complete!");
  // Turn LEDs green to indicate success
});

ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
  unsigned int percent = (progress / (total / 100));
  Serial.printf("Progress: %u%%\n", percent);
});

ArduinoOTA.onError([](ota_error_t error) {
  Serial.printf("Error[%u]: ", error);
  if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
  else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
  else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
  else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
  else if (error == OTA_END_ERROR) Serial.println("End Failed");
  // Turn LEDs red to indicate error
});

ArduinoOTA.begin();
```

### Flash Memory Requirements

**Critical:** The flash chip must be large enough to hold **both** the current sketch and the new sketch simultaneously.

**Check available space:**
```cpp
uint32_t freeSpace = ESP.getFreeSketchSpace();
Serial.printf("Free sketch space: %u bytes\n", freeSpace);
```

**Typical partition schemes:**
- **Default (4MB)**: Two OTA partitions of ~1.3MB each
- **Minimal OTA**: Reduces partition sizes for space-constrained applications
- **Custom**: Define custom partition table via `partition.csv`

---

## espota.py Protocol

### Overview

`espota.py` is the Python script used by Arduino IDE and PlatformIO to upload firmware to ESP32 devices over WiFi. It implements the espota protocol that communicates with ArduinoOTA.

**Location on macOS (with PlatformIO):**
```
~/.platformio/packages/framework-arduinoespressif32/tools/espota.py
```

### Command-Line Arguments

```bash
python espota.py [options]

Required:
  -i, --ip IP_ADDRESS          ESP32 IP address
  -f, --file FIRMWARE.bin      Firmware binary to upload

Optional:
  -p, --port PORT              ESP32 OTA port (default: 3232)
  -P, --host_port PORT         Host port (default: random 10000-60000)
  -a, --auth PASSWORD          Authentication password
  -m, --md5-target             Use MD5 for password (legacy devices)
  -s, --spiffs                 Upload SPIFFS image instead of firmware
  -d, --debug                  Enable debug output
  -r, --progress               Display progress bar
  -t, --timeout SECONDS        Timeout for invitation (default: 10)
```

### Example Usage

```bash
# Basic upload
python espota.py -i 192.168.1.100 -f firmware.bin

# With hostname (mDNS)
python espota.py -i rgfx-driver.local -f firmware.bin

# With password and progress
python espota.py -i 192.168.1.100 -f firmware.bin -a mypassword -r

# Upload SPIFFS filesystem
python espota.py -i 192.168.1.100 -f spiffs.bin --spiffs
```

### Protocol Workflow

**Step 1: Invitation (UDP)**
1. Client sends invitation packet to device (UDP port 3232 by default)
2. Packet contains: command type, host port, file size, MD5 hash
3. Device validates and responds with authentication challenge or "OK"

**Step 2: Authentication (Optional)**
1. Device sends nonce (random challenge string)
2. Client computes response using password + nonce
3. Two methods supported:
   - **New (3.3.1+)**: PBKDF2-HMAC-SHA256 with 64-char nonce
   - **Old (legacy)**: MD5-based with 32-char nonce
4. Client sends authentication response
5. Device validates and responds with "OK" or error

**Step 3: Firmware Upload (TCP)**
1. Client establishes TCP connection to device
2. Firmware binary uploaded in 1024-byte chunks
3. Device writes to flash partition
4. Device validates MD5 checksum
5. Device confirms receipt

**Step 4: Reboot**
1. Device reboots with new firmware
2. Bootloader switches to new partition
3. New firmware starts executing

### Protocol Commands

| Command | Code | Purpose |
|---------|------|---------|
| `FLASH` | 0 | Upload firmware binary |
| `SPIFFS` | 100 | Upload filesystem image |
| `AUTH` | 200 | Authentication challenge/response |

### Authentication Methods

**Old Protocol (Pre-3.3.1):**
- Uses MD5 hash
- 32-character nonce
- Format: `MD5(password + nonce)`

**New Protocol (3.3.1+):**
- Uses PBKDF2-HMAC-SHA256 (preferred) or MD5 (fallback)
- 64-character nonce
- More secure, resistant to rainbow table attacks

**Automatic Detection:**
espota.py automatically detects protocol version based on nonce length and attempts both authentication methods for compatibility.

---

## ESP32 OTA Architecture

### Partition Layout

ESP32 OTA requires specific partition layout with multiple app slots:

**Minimal OTA Partition Table:**
```
# Name,   Type, SubType, Offset,  Size,    Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x140000,
app1,     app,  ota_1,   0x150000,0x140000,
spiffs,   data, spiffs,  0x290000,0x170000,
```

**Components:**
- **nvs**: Non-volatile storage for configuration (survives OTA)
- **otadata**: OTA metadata (tracks which app partition to boot)
- **app0/app1**: Two application partitions for safe updates
- **spiffs**: File system storage (optional)

### Safe Update Mode

**How it works:**
1. Device currently running from `app0`
2. OTA update writes new firmware to `app1`
3. OTA data partition updated to point to `app1`
4. Device reboots and bootloader loads `app1`
5. Old firmware in `app0` remains as backup

**Key benefit:** If update fails during write, device still boots from `app0` (current working firmware).

### Rollback System

ESP-IDF includes automatic rollback protection:

**App States:**
| State | Description | Boot Behavior |
|-------|-------------|---------------|
| `ESP_OTA_IMG_VALID` | Confirmed working | Always boots |
| `ESP_OTA_IMG_UNDEFINED` | Unknown state | Boots normally |
| `ESP_OTA_IMG_NEW` | Just uploaded | Single boot attempt (if rollback enabled) |
| `ESP_OTA_IMG_PENDING_VERIFY` | Needs validation | Won't boot (if rollback enabled) |
| `ESP_OTA_IMG_INVALID` | Confirmed broken | Won't boot |
| `ESP_OTA_IMG_ABORTED` | Update failed | Won't boot |

**Validation Functions:**
```cpp
#include <esp_ota_ops.h>

// Mark app as working (call after successful boot/self-test)
esp_ota_mark_app_valid_cancel_rollback();

// Mark app as broken and rollback to previous
esp_ota_mark_app_invalid_rollback_and_reboot();
```

**Automatic Rollback:**
If `CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE` is set and app doesn't call validation function within timeout, bootloader automatically rolls back to previous firmware.

### Anti-Rollback Protection

Prevents downgrading to firmware with known security vulnerabilities:

**How it works:**
1. Each firmware has a security version number
2. Security version stored in eFuse (one-time programmable)
3. Bootloader rejects firmware with version < eFuse value
4. Prevents attackers from exploiting old vulnerabilities

**Limitations:**
- Only 32 bits available (32 sequential security updates max)
- Irreversible - can't downgrade once eFuse written
- Requires eFuse encoding set to `NONE`

### Performance Optimization

**1. Bulk Flash Erase:**
```cpp
esp_https_ota_config_t config = {
  .bulk_flash_erase = true  // Erase entire partition at once
};
```
Faster but may trigger watchdog on large partitions.

**2. Buffer Configuration:**
```cpp
config.http_config.buffer_size = 4096;  // Larger buffer = faster
config.http_config.buffer_caps = MALLOC_CAP_INTERNAL;  // Use internal RAM
```

**3. Network Tuning:**
- Use wired Ethernet if available
- Reduce other network traffic during update
- Increase TCP window size

---

## Security

### Digest Authentication

**Basic Protection (MD5):**
- ArduinoOTA uses MD5 digest authentication by default
- Prevents unauthorized uploads
- **Warning:** MD5 is weak against determined attackers

**Improved (PBKDF2-HMAC-SHA256):**
- Available in newer firmware (3.3.1+)
- Much more resistant to brute force
- Uses key derivation function with iterations

### Password Protection

**Set password on device:**
```cpp
ArduinoOTA.setPassword("your-secure-password");
```

**Upload with password:**
```bash
python espota.py -i 192.168.1.100 -f firmware.bin -a your-secure-password
```

**Best practices:**
- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Change default passwords
- Different password per device for critical deployments
- Store passwords securely (not in source code)

### Cryptographic Signing

**For high-security applications:**
- Use RSA-2048 signatures with SHA256
- Firmware signed before distribution
- Device validates signature before flashing
- Prevents malicious firmware injection

**Enable signing:**
1. Set `CONFIG_SECURE_SIGNED_APPS_NO_SECURE_BOOT=y`
2. Set `CONFIG_SECURE_SIGNED_ON_UPDATE_NO_SECURE_BOOT=y`
3. Generate RSA key pair
4. Sign firmware binaries before upload
5. Device validates signature using public key

**Format:**
```
[FIRMWARE-BINARY] [RSA-SIGNATURE] [SIGNATURE-LENGTH (uint32)]
```

### Data Integrity

**MD5 Checksum:**
- Every firmware upload includes MD5 hash
- Device validates hash after download
- Corrupted uploads rejected automatically
- Protects against network transmission errors

### Network Security

**Recommendations:**
- Use isolated WiFi network for OTA updates
- Enable WPA2/WPA3 encryption
- Disable OTA on production devices until needed
- Use VPN for remote updates over internet
- Implement rate limiting to prevent brute force

---

## Troubleshooting

### Common Issues

**1. Device not found / Connection timeout**

**Symptoms:**
```
ERROR: No response from device
ERROR: Timeout waiting for invitation
```

**Solutions:**
- Verify device is connected to WiFi (`WiFi.status() == WL_CONNECTED`)
- Check IP address is correct (`WiFi.localIP()`)
- Verify device is on same network/subnet as updater
- Check firewall rules (allow UDP 3232, TCP ephemeral ports)
- Ensure `ArduinoOTA.begin()` was called
- Verify `ArduinoOTA.handle()` called regularly in `loop()`

**2. Authentication Failed**

**Symptoms:**
```
ERROR: Authentication Failed
ERROR: Auth Failed
```

**Solutions:**
- Verify password matches between device and espota.py
- Check for typos in password
- Try with `-m` flag for legacy MD5 authentication
- Ensure device password set with `setPassword()` not `setPasswordHash()`

**3. Upload Failed / Receive Error**

**Symptoms:**
```
ERROR: Upload Failed
ERROR: Receive Failed
OTA_RECEIVE_ERROR
```

**Solutions:**
- Check network stability (WiFi signal strength)
- Reduce `ArduinoOTA.handle()` call frequency if blocking
- Increase timeout with `-t` parameter
- Verify sufficient free space (`ESP.getFreeSketchSpace()`)
- Check for memory leaks in application code

**4. End Failed / Validation Error**

**Symptoms:**
```
ERROR: End Failed
OTA_END_ERROR
MD5 mismatch
```

**Solutions:**
- Firmware corrupted during transfer - retry upload
- Check flash memory not failing
- Verify binary file not corrupted locally
- Try smaller firmware or different partition scheme

**5. Device boots to old firmware after update**

**Symptoms:**
- Update completes successfully
- Device reboots to previous firmware version

**Solutions:**
- OTA data partition may be corrupted - erase and retry
- Check partition table has `otadata` partition defined
- Verify bootloader supports OTA (recent esp-idf version)
- Use `esp_ota_set_boot_partition()` explicitly if needed

**6. Insufficient Space**

**Symptoms:**
```
ERROR: Not enough space
OTA_BEGIN_ERROR
```

**Solutions:**
- Reduce sketch size (disable debug, optimize code)
- Use custom partition table with larger app partitions
- Remove unused libraries
- Use PROGMEM for large constant data
- Check `ESP.getFreeSketchSpace()` before update

### Debug Output

**Enable verbose logging:**

```cpp
ArduinoOTA.onError([](ota_error_t error) {
  Serial.printf("Error[%u]: ", error);
  if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
  else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
  else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
  else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
  else if (error == OTA_END_ERROR) Serial.println("End Failed");
});
```

**Enable espota.py debug:**
```bash
python espota.py -i 192.168.1.100 -f firmware.bin -d
```

### Network Diagnostics

**Test UDP connectivity:**
```bash
# Send UDP packet to device
echo "test" | nc -u 192.168.1.100 3232

# Check if port is open
nmap -sU -p 3232 192.168.1.100
```

**Test TCP connectivity:**
```bash
# Check if device accepts TCP on random port
telnet 192.168.1.100 54321
```

**mDNS resolution:**
```bash
# Resolve hostname to IP
dns-sd -G v4 rgfx-driver.local

# Browse for _arduino._tcp services
dns-sd -B _arduino._tcp local.
```

---

## Best Practices

### Development Workflow

1. **Initial Upload:** Always upload first firmware via USB/serial
2. **Enable OTA:** Include ArduinoOTA code in every sketch
3. **Test Locally:** Verify OTA works on local network before deployment
4. **Version Tracking:** Include firmware version in code for verification
5. **Logging:** Log OTA events for debugging

### Production Deployment

1. **Staged Rollout:** Update small subset of devices first
2. **Monitoring:** Monitor device health after updates
3. **Rollback Plan:** Keep previous firmware readily available
4. **Validation:** Implement self-tests to validate functionality
5. **Backup Configuration:** Ensure NVS config survives updates

### Security Hardening

1. **Authentication:** Always use password protection
2. **Signing:** Use cryptographic signing for critical deployments
3. **Network Isolation:** Use separate network for updates
4. **Access Control:** Restrict who can trigger updates
5. **Audit Logs:** Log all update attempts and outcomes

---

## RGFX Integration Notes

### Current Implementation

The RGFX Driver firmware already includes full ArduinoOTA support in `esp32/src/main.cpp`:

```cpp
ArduinoOTA.setHostname(Utils::getDeviceName().c_str());  // e.g., "rgfx-driver-f89a58"
ArduinoOTA.onStart([]() { /* Orange LEDs */ });
ArduinoOTA.onEnd([]() { /* Green LEDs */ });
ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) { /* Log progress */ });
ArduinoOTA.onError([](ota_error_t error) { /* Red LEDs */ });
ArduinoOTA.begin();
```

### Hub-Orchestrated Updates

The RGFX Hub can use `espota.py` to upload firmware to Drivers:

**Node.js/TypeScript example:**
```typescript
import { spawn } from 'child_process';

const espotaPath = '~/.platformio/packages/framework-arduinoespressif32/tools/espota.py';
const firmwarePath = '/tmp/rgfx-driver.bin';
const driverIP = '192.168.1.100';  // or 'rgfx-driver-f89a58.local'

const espota = spawn('python3', [
  espotaPath,
  '-i', driverIP,
  '-f', firmwarePath,
  '-r',  // progress bar
  '-t', '30'  // 30 second timeout
]);

espota.stdout.on('data', (data) => {
  console.log(`Progress: ${data}`);
  // Parse progress and update UI
});

espota.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

espota.on('close', (code) => {
  if (code === 0) {
    console.log('OTA update successful');
  } else {
    console.error(`OTA update failed with code ${code}`);
  }
});
```

### Configuration Preservation

**CRITICAL:** RGFX uses ESP32 Preferences (NVS) for configuration storage. NVS data survives OTA updates because it's in a separate partition.

**Verify partition table includes:**
```
nvs,      data, nvs,     0x9000,  0x5000,
```

This ensures WiFi credentials, device names, and LED configurations persist across firmware updates.

---

## References

- [Espressif ESP-IDF OTA Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [ESP8266/ESP32 Arduino OTA](https://github.com/esp8266/Arduino/blob/master/doc/ota_updates/readme.rst)
- [espota.py Source](https://github.com/espressif/arduino-esp32/blob/master/tools/espota.py)
- [ArduinoOTA Library](https://github.com/esp8266/Arduino/tree/master/libraries/ArduinoOTA)
- [PlatformIO ESP32 Platform](https://docs.platformio.org/en/latest/platforms/espressif32.html)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-26
**Maintained by:** RGFX Project
