# Network Module

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains all network communication code for the ESP32 driver firmware, including MQTT messaging, UDP effects transport, OTA updates, and network service initialization.

## Architecture

The network module runs primarily on **Core 0** (the "protocol core") via `networkTask()`, keeping network operations separate from the LED rendering on Core 1. This dual-core architecture ensures smooth LED animations even during network activity.

### Communication Protocols

| Protocol | Purpose | QoS |
|----------|---------|-----|
| MQTT | Configuration, commands, telemetry, status | QoS 2 (exactly-once) |
| UDP | Real-time effect messages from Hub | Best-effort (low latency) |
| mDNS | Device discovery and OTA advertising | - |
| UDP Broadcast | MQTT broker discovery (SSDP-style) | - |

## Files

| File | Description |
|------|-------------|
| `mqtt.h/cpp` | MQTT client setup, connection lifecycle, topic management |
| `mqtt_callback.cpp` | MQTT message routing and deferred operation processing |
| `mqtt_discovery.cpp` | UDP broadcast listener for MQTT broker discovery |
| `mqtt_publisher.cpp` | Outbound MQTT messages: telemetry, test state, errors |
| `mqtt_config_handler.cpp` | Handles driver configuration messages from Hub (parses rgbw_mode for RGBW strips). Note: name/description fields removed from config parsing. |
| `network_init.h/cpp` | Initializes all network services when WiFi connects |
| `network_task.h/cpp` | FreeRTOS task running network loop on Core 0 |
| `ota_update.h/cpp` | ArduinoOTA setup with LED progress indicators |
| `udp.h/cpp` | UDP listener for real-time effect messages. Uses static JsonDocument in `checkUDPMessage()` to reuse heap pool across calls and reduce fragmentation. |

## MQTT Topics

### Subscribed Topics (Driver receives)
- `rgfx/driver/{MAC}/config` - LED device configuration from Hub
- `rgfx/driver/{MAC}/logging` - Remote logging level control
- `rgfx/driver/{device-id}/test` - Test mode toggle
- `rgfx/driver/{device-id}/reset` - Factory reset command
- `rgfx/driver/{device-id}/reboot` - Reboot command

### Published Topics (Driver sends)
- `rgfx/system/driver/telemetry` - Periodic telemetry (30s interval)
- `rgfx/driver/{device-id}/status` - Online/offline status (with LWT)
- `rgfx/driver/{device-id}/test/state` - Current test mode state (published only when test mode changes, not on reconnect)

## Broker Discovery

The driver discovers the MQTT broker via UDP broadcast:
1. Hub broadcasts `{"service":"rgfx-mqtt-broker","ip":"...","port":1883}` on port 8889 every 5 seconds
2. Driver listens and validates broker is on same subnet
3. Once discovered, MQTT connection is established

## Thread Safety

**CRITICAL:** The `256dpi/MQTT` library is NOT thread-safe. All MQTT client operations must happen on a single core.

- **Core 0 (Network Task):** Handles all MQTT operations via `mqttLoop()` and `processLogQueue()`
- **Core 1 (Application Loop):** Must NOT directly call `mqttClient.publish()`

The `log()` function uses a FreeRTOS queue to safely pass log messages from any core to Core 0 for MQTT publishing. This prevents race conditions that can corrupt the MQTT connection state.

When adding new MQTT publish calls, always use the log queue pattern or ensure the call is made from the network task.

## Cross-Core Watchdog

For effects running on Core 1 (like projectile), a cross-core watchdog mechanism is used:
- Core 1 writes effect completion status to a shared flag
- Core 0 monitors this flag and can terminate runaway effects
- Prevents infinite animation loops from blocking rendering

## Network Initialization Flow

1. WiFi connects (via IotWebConf portal or saved credentials)
2. `setupNetworkServices()` is called:
   - Disable WiFi power saving for low latency
   - Start mDNS responder
   - Setup OTA updates
   - Load saved LED config from NVS
   - Initialize MQTT client
   - Start UDP listener
3. `networkTask()` runs continuous loop:
   - Process config portal requests
   - Poll for MQTT broker (every 3s until found)
   - Handle MQTT messages
   - Process log queue (publish queued log messages)
   - Send periodic telemetry (every 10s)
   - Handle OTA updates

## UDP Message Format

Effect messages received via UDP:
```json
{
  "effect": "pulse",
  "props": {
    "color": "#FF0000",
    "duration": 500
  }
}
```

UDP packets are only accepted from the Hub's IP address (validated against discovered MQTT broker IP).

### UDP Queue

UDP messages are stored in a circular buffer queue for burst handling:
- **Queue Size:** 16 messages (handles high-load burst traffic)
- **Access Pattern:** Single-threaded (Core 1 only) - no cross-core sync needed
- **Overflow:** When full, new messages are dropped (counter incremented)
- **Telemetry:** `getUdpQueueDepth()` exposes current queue depth for monitoring

## Key Constants (from config/constants.h and udp.h)

- `MQTT_PORT` - MQTT broker port (1883)
- `MQTT_BUFFER_SIZE` - MQTT message buffer size
- `UDP_PORT` - UDP listener port for effects
- `UDP_BUFFER_SIZE` - UDP message buffer size (1472 bytes, max without IP fragmentation)
- `UDP_QUEUE_SIZE` - UDP message queue capacity (16 messages)
- `SSDP_POLL_INTERVAL_MS` - Broker discovery poll interval (3000ms)
- `TELEMETRY_INTERVAL_MS` - Telemetry broadcast interval (10000ms)

## Dependencies

- `WiFi.h` / `WiFiUdp.h` - ESP32 WiFi stack
- `MQTTClient.h` - MQTT client library
- `ArduinoOTA.h` - Over-the-air updates
- `ESPmDNS.h` - mDNS/Bonjour responder
- `ArduinoJson.h` - JSON parsing
- `FastLED.h` - LED feedback during OTA
