# System Architecture

RGFX is a distributed system that monitors retro arcade games and translates game events into LED effects across physical devices.

## Component Overview

In this example we have three games creating effects on two drivers.

```mermaid
flowchart TB
    subgraph MAME["MAME emulator + rgfx.lua"]
        subgraph Interceptors[User Lua Interceptors]
            I1[Pac-Man]
            I2[Star Wars]
            I3[Mario Bros]
        end
    end

    MAME --> Log[Events Log File]

    subgraph Hub["RGFX Hub"]
        subgraph Transformers[User JS Transformers]
            T1[Pac-Man]
            T2[Star Wars]
            T3[Mario Bros]
        end
    end

    Log --> Hub

    subgraph Drivers["ESP32 + LED hardware"]
      D1["RGFX Driver 1 (LED Strip)"]
      D2["RGFX Driver 2 (LED Matrix)"]
    end

    Hub -->|Network| Drivers
```

## Data Flow

1. **MAME** runs a retro game with a Lua interceptor loaded
2. **Lua Interceptor** monitors game memory and writes events to a log file
3. **RGFX Hub** watches the log file and maps events to LED effects
4. **UDP messages** deliver effect commands to ESP32 drivers in real-time
5. **MQTT** handles configuration, status reporting, and firmware updates
6. **ESP32 Drivers** render effects on connected LED hardware

## Communication Protocols

| Protocol | Purpose | Latency |
|----------|---------|---------|
| UDP | Real-time effect delivery | Low (~1ms) |
| MQTT (QoS 2) | Configuration, logging, OTA | Reliable |
| SSDP | Broker discovery | One-time |
| mDNS | OTA hostname resolution | One-time |

## Learn More

- [Getting Started](getting-started.md) - Set up your first RGFX installation
