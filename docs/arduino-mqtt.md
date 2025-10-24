# Arduino-MQTT Library Documentation

## Overview
This library bundles the **lwmqtt MQTT 3.1.1 client** and provides an Arduino-compatible API wrapper. It's available through the Arduino IDE Library Manager (search "lwmqtt") and PlatformIO.

## Supported Hardware
- Arduino Yun & Yun-Shield
- Arduino Ethernet Shield
- Arduino WiFi Shield
- Adafruit HUZZAH ESP8266
- Arduino WiFi101 Shield
- Arduino MKR GSM 1400
- Arduino MKR NB 1500
- ESP32 Development Board
- Any board with Client-based network implementation

## Key Features

### Buffer Configuration
The library uses separate read/write buffers (default 128 bytes each). Customize with:
- `MQTTClient client(256)` — sets both buffers to 256 bytes
- `MQTTClient client(256, 512)` — read buffer 256, write buffer 512

**Note:** Version 2.5.2+ streams payload directly, so write buffers only encode headers/topics.

### QoS Support
Supports MQTT Quality of Service levels for both publishing and subscribing operations.

## Core API

### Initialization
```cpp
void begin(const char hostname[], int port, Client &client);
void setHost(const char hostname[], int port);
```

### Connection Management
```cpp
bool connect(const char clientID[], const char username[], const char password[]);
bool connected();
bool disconnect();
```

### Message Operations
```cpp
bool publish(const char topic[], const char payload[], bool retained, int qos);
bool subscribe(const char topic[], int qos);
bool unsubscribe(const char topic[]);
bool loop();  // Process send/receive — call in every loop iteration
```

### Message Reception
Register callbacks for incoming messages:
```cpp
void onMessage(MQTTClientCallbackSimple);
// Signature: void messageReceived(String &topic, String &payload) {}

void onMessageAdvanced(MQTTClientCallbackAdvanced);
// Signature: void messageReceived(MQTTClient *client, char topic[], char bytes[], int length) {}
```

**Important:** Avoid calling `subscribe()`, `unsubscribe()`, or QoS > 0 `publish()` directly within callbacks to prevent deadlocks.

### Advanced Options
```cpp
void setKeepAlive(int keepAlive);           // seconds (default: 10)
void setCleanSession(bool cleanSession);    // (default: true)
void setTimeout(int timeout);               // milliseconds (default: 1000)
void setWill(const char topic[], const char payload[], bool retained, int qos);
void setClockSource(MQTTClientClockSource);  // for deep-sleep support
```

### Session & Debugging
```cpp
bool sessionPresent();
void dropOverflow(bool enabled);
uint32_t droppedMessages();
lwmqtt_err_t lastError();
lwmqtt_return_code_t returnCode();
```

## Important Notes

- **ESP8266:** Add `delay(10);` after `client.loop();` to improve WiFi stability
- **Shiftr.io:** Use instance name as username and token secret as password
- **Local DNS:** Arduino doesn't support `.local` domains; use IP addresses directly
- **Packet IDs:** Use `lastPacketID()` and `prepareDuplicate()` for QoS 1/2 retry logic
- **No Persistent Packet Store:** Library has no local packet store, so no packets are retransmitted upon reconnection. Use return value of publish() to check if message has been acked for QoS 1/2.
- **License:** MIT

## Example Usage Pattern
Initialize → Configure callbacks → Connect → Call `loop()` continuously in main loop → Publish/Subscribe as needed

## PlatformIO Installation
```
pio lib install "256dpi/MQTT"
```

## Library Source
https://github.com/256dpi/arduino-mqtt
