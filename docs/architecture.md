# RGFX Multi-Device Architecture

## Overview

RGFX is a distributed system for monitoring retro arcade game state and translating game events into LED effects across multiple physical devices.

### System Components

- **RGFX Hub** - Central controller (Python bridge, future Electron/TypeScript app) that monitors game events and orchestrates LED effects
- **RGFX Drivers** - ESP32-based devices that control physical LED hardware
- **Game Scripts** - Emulator-specific scripts that extract game events
- **Event Pipeline** - Events file abstraction layer enabling multi-emulator support

### Communication Protocols

- **MQTT (QoS 2)** - Critical operations requiring reliability (driver connection, provisioning, configuration, logging, OTA updates)
- **UDP** - Low-latency game event delivery for real-time effects
- **SSDP** - MQTT broker discovery (drivers find Hub's embedded broker automatically)
- **mDNS** - ArduinoOTA hostname registration (enables OTA uploads via `.local` hostnames)

### Design Principles

1. **Emulator Agnostic** - Events file abstraction supports MAME and future emulators
2. **Zero Configuration** - Automatic MQTT broker discovery via SSDP, OTA via mDNS hostnames
3. **Graceful Sequencing** - System handles any startup order (Hub first, Drivers first, or mixed)
4. **Community-Driven** - Open-source game scripts bundled with installer
5. **Scalable** - Support for multiple Drivers, multiple LED devices per Driver

---

## Architecture Components

### RGFX Hub (Central Controller)

**Implementation:** Electron/TypeScript application with React + Material UI

**Responsibilities:**
- Monitor game events from emulator events file
- Discover and track RGFX Drivers on network
- Map game events to LED effects on specific devices
- Distribute effects to appropriate Drivers via UDP
- Provision and configure Drivers via MQTT
- Aggregate logs from all Drivers
- Manage firmware updates for Drivers
- Provide configuration and testing UI

**Key Features:**
- Embedded MQTT broker with SSDP announcement for driver discovery
- Device registry with state tracking (discovered, provisioning, configured, online, offline)
- Event mapping table (game events → Driver + LED device + effect)
- Virtual LED arrays with down-sampling for smooth animations
- Test mode for validating configurations without running games

---

### RGFX Drivers (ESP32 Devices)

**Hardware:** ESP32 microcontroller with WiFi

**Responsibilities:**
- Control physical LED hardware (strips, matrices)
- Receive effect commands via UDP
- Discover Hub's MQTT broker via SSDP
- Accept configuration via MQTT
- Report status and logs to Hub
- Execute LED effects in real-time
- Register mDNS hostname for OTA updates

**Capabilities:**
- Multiple data pins (GPIO 16, 17, 18, etc.)
- Multiple LED devices per pin with offset addressing
- Support for LED strips and matrices
- Matrix-specific configurations (serpentine patterns, dimensions)
- Persistent configuration storage (survives firmware updates)
- OTA firmware updates

---

### LED Device Configuration

Each RGFX Driver can control multiple LED devices across multiple data pins.

**Device Structure:**
- **Data Pin** - GPIO pin number (e.g., GPIO 16, 17, 18)
- **LED Device** - Named physical LED hardware connected to a pin
  - User-defined name (e.g., "Marquee", "CoinSlot", "P1Buttons")
  - LED index offset (starting position in data stream)
  - LED count (number of LEDs in device)
  - Device type (strip or matrix)
  - Matrix configuration (width, height, serpentine pattern)

**Example Configuration:**
```
RGFX Driver "Cabinet-1"
├─ Pin 16
│  ├─ "Marquee" (strip, offset 0, 100 LEDs)
│  └─ "CoinSlot" (8x8 matrix, offset 100, 64 LEDs, serpentine)
├─ Pin 17
│  └─ "P1Buttons" (strip, offset 0, 20 LEDs)
└─ Pin 18
   └─ "P2Buttons" (strip, offset 0, 20 LEDs)
```

---

### Event Mapping System

The Hub uses a mapping table to translate game events into LED effects on specific devices.

**Mapping Structure:**
- Game event (exact string match, wildcards future enhancement)
- Target devices (one-to-many relationship)
- Effect specification (name + optional parameters)
- Color specification (hex color code)

**Example Mapping:**
```
Event: "pacman/player/score/p1"
Targets:
  - Driver: "Cabinet-1", LED Device: "Marquee"
    Effect: pulse (duration: 500ms)
    Color: FFFF00 (yellow)
  - Driver: "Cabinet-1", LED Device: "CoinSlot"
    Effect: sparkle
    Color: FFFF00 (yellow)
```

**Features:**
- User-editable via GUI
- Stored as JSON configuration file
- One event can trigger multiple devices simultaneously
- Effect parameters customizable per target
- Missing devices handled gracefully (logged, skipped)

---

### Network Discovery & Addressing

**mDNS-Based Discovery:**
- Each Driver announces presence via mDNS service
- Service name format: `{driver-name}._rgfx._tcp.local`
- Hub maintains device registry mapping names to IP addresses
- Registry automatically updates when devices appear/disappear
- No manual IP configuration required

**Connection Sequencing:**
- System supports any startup order
- Hub can start before Drivers (discovers devices as they appear)
- Drivers can start before Hub (Hub discovers on startup)
- Handles device restarts and network reconnections gracefully

**Device States:**
- **Discovered** - Device found via mDNS, not yet configured
- **Provisioning** - Configuration being sent to device
- **Configured** - Device has valid configuration
- **Online** - Device responding to heartbeat
- **Offline** - Device not responding (timeout)

---

### Virtual LED Arrays & Down-sampling

**Purpose:** Render effects at higher resolution for smoother animations

**Implementation:**
- Effects rendered to virtual buffer at 4x or 8x physical resolution
- Down-sampling performed on Hub (leverages more CPU power)
- Physical resolution sent to Drivers via UDP
- Transparent to Drivers (receive final pixel data)

**Benefits:**
- Smoother gradients and color transitions
- Higher quality animations on limited LED hardware
- No additional Driver processing required

---

## Implementation Priorities

### Priority 1: Multi-LED Driver Support (Foundation)

**Goal:** Enable single Driver to control multiple LED devices across multiple data pins

**Key Deliverables:**
- Support for multiple GPIO pins
- Multiple LED devices per pin with offset addressing
- Device type support (strips and matrices)
- Matrix configuration (serpentine patterns, dimensions)
- User-defined names for LED devices
- Configuration persistence in NVS (survives firmware updates)
- Enhanced UDP message routing (target specific LED devices)

**Impact:** Foundation for all multi-device functionality

---

### Priority 2: Device Discovery & Registry (Core Infrastructure)

**Goal:** Hub automatically discovers and tracks all Drivers on network

**Key Deliverables:**
- Background mDNS scanning
- Device registry with state management
- IP address resolution (driver name → IP)
- Handle any startup sequence
- Persist registry to disk
- UI display of device status

**Impact:** Enables zero-configuration multi-device support

---

### Priority 3: Event Mapping System (Core Functionality)

**Goal:** Route game events to specific devices and effects

**Key Deliverables:**
- JSON mapping configuration file
- Exact string matching (wildcards deferred)
- One-to-many event routing
- Effect parameter support
- GUI editor for mappings
- Graceful handling of missing devices

**Impact:** Core user-facing functionality

---

### Priority 4: MQTT Integration (Critical Communications)

**Goal:** Implement reliable communication channel for critical operations

**Key Deliverables:**
- MQTT broker integration
- Topic structure for discovery, provisioning, configuration, logs, OTA
- Driver presence announcements
- Hub provisioning workflow
- Status reporting from Drivers

**Impact:** Enables reliable configuration and management

---

### Priority 5: Test Mode & Configuration UI (Developer Experience)

**Goal:** Enable testing and validation without running games

**Key Deliverables:**
- Device identification (flash LEDs to locate)
- Individual LED device testing
- Effect browser and manual triggering
- Event simulator
- Configuration validation
- LED hardware tests (color wipe, pattern verification)

**Impact:** Essential for development, debugging, and user configuration

---

### Priority 6: Virtual LED Arrays (Quality Enhancement)

**Goal:** Improve animation quality through down-sampling

**Key Deliverables:**
- Virtual buffer system (4x/8x resolution)
- Hub-side rendering to virtual buffers
- Down-sampling algorithm (box filter averaging)
- Per-device oversampling configuration
- Integration with effect pipeline

**Impact:** Visual quality improvement, smoother animations

---

### Priority 7: OTA Update System (Maintenance)

**Goal:** Remote firmware updates for entire system

**Key Deliverables:**
- Hub checks online repository for updates
- User notification and approval workflow
- Driver firmware distribution via MQTT/HTTP
- Sequential device updates
- Configuration preservation during updates
- Rollback on failure
- Hub self-update (Electron auto-updater)
- Version tracking per device

**Impact:** Long-term maintainability and feature updates

---

### Priority 8: Logging & Monitoring (Operations)

**Goal:** Centralized logging for debugging and monitoring

**Key Deliverables:**
- Driver-side ring buffer (last 100 entries)
- Log forwarding via MQTT
- Hub log aggregation
- Persistent storage with rotation (7 days)
- UI log viewer (filter by device, level, timestamp)
- Health monitoring and status

**Impact:** Operational visibility and troubleshooting

---

## Suggested Implementation Order

1. **Phase 1:** Multi-LED Driver Support (Priority 1)
2. **Phase 2:** Device Discovery & Registry (Priority 2)
3. **Phase 3:** Event Mapping System (Priority 3)
4. **Phase 4:** MQTT Integration (Priority 4)
5. **Phase 5:** Test Mode & Configuration UI (Priority 5)
6. **Phase 6:** Virtual LED Arrays (Priority 6)
7. **Phase 7:** OTA Update System (Priority 7)
8. **Phase 8:** Logging & Monitoring (Priority 8)

**Rationale:** Build foundation first, then core features, followed by developer tools, quality enhancements, and operational capabilities.

---

## Migration Path

**Backward Compatibility:**
- Events file format remains unchanged
- Lua script API unchanged
- Existing effects continue working
- Single-device UDP mode supported during development

**Technology Evolution:**
- ✅ Python bridge → Electron/TypeScript app (completed)
- ✅ Terminal UI → React + Material UI (completed)
- Community game scripts bundled with releases

---

## Technology Stack

### RGFX Hub
- **Platform:** Electron, TypeScript, React + Material UI
- **MQTT:** Aedes (embedded broker)
- **Discovery:** bonjour-service (mDNS)
- **Build:** Electron Forge + Vite
- **State:** Zustand + Redux DevTools
- **Network:** UDP sockets, JSON configuration

### RGFX Drivers (ESP32)
- **Platform:** ESP32 (espressif32)
- **Framework:** Arduino
- **Libraries:**
  - FastLED (LED control)
  - PubSubClient (MQTT)
  - ArduinoJson (JSON parsing)
  - IotWebConf (web configuration portal)
  - ESP mDNS (service announcement)
- **Storage:** NVS/Preferences (configuration persistence)

### Game Scripts
- **Language:** Lua 5.4
- **Environment:** MAME embedded Lua with Sol3 bindings
- **API:** MAME Lua scripting API (memory access, callbacks)

---

## Future Enhancements

**Planned but deferred:**
- Wildcard/pattern matching in event mappings
- Conditional logic in event mappings (e.g., score thresholds)
- Support for additional LED chipsets (APA102, SK6812, etc.)
- Multi-emulator support (RetroArch, Dolphin, PCSX2)
- Advanced matrix layouts (irregular shapes, custom mappings)
- Effect plugins/extensions system
- Cloud-based game script repository with versioning
- Mobile app for remote monitoring/control
- Web-based configuration interface
- Integration with home automation systems (Home Assistant, etc.)

---

## Open Source & Community

**Repository Structure:**
- Main repository contains Hub, Driver firmware, and game scripts
- Community contributions via pull requests
- Game scripts organized by emulator/system
- Documentation templates for new game support
- Example configurations and tutorials

**Community Contributions:**
- Game script development (RAM address discovery, event definitions)
- Effect development (new LED animations)
- Testing and validation
- Documentation improvements
- Translation/localization

---

## Hardware Requirements

### RGFX Hub
- **Platform:** macOS (current development), future cross-platform (Windows, Linux)
- **Network:** WiFi or Ethernet on same network as Drivers
- **MQTT Broker:** Embedded Aedes (built into Hub)

### RGFX Drivers
- **Microcontroller:** ESP32 (espressif32 platform)
- **Power:** 5V USB or external power supply
- **LEDs:** WS2812B compatible (current), future chipset support
- **Network:** 2.4GHz WiFi

### LED Hardware
- **Supported Types:** Addressable LED strips, LED matrices
- **Chipset:** WS2812B (current)
- **Power:** External 5V power supply recommended for large installations
- **Data:** Single-wire data connection per pin

---

## Project Structure

```
rgfx/
├── docs/                       # Documentation
│   └── architecture.md         # This file
├── rgfx-hub/                   # Electron Hub application
│   ├── src/                   # Source code
│   │   ├── main.ts           # Main process
│   │   ├── mqtt.ts           # Embedded Aedes broker
│   │   ├── udp.ts            # UDP communication
│   │   ├── event-file-reader.ts  # MAME events monitor
│   │   ├── renderer.tsx      # React UI entry point
│   │   └── components/       # React components
│   ├── package.json          # Dependencies and scripts
│   └── forge.config.ts       # Electron Forge config
├── esp32/                      # ESP32 Driver firmware
│   ├── src/                   # Source code
│   │   ├── main.cpp          # Main application
│   │   ├── config_leds.cpp   # LED configuration
│   │   ├── udp.cpp           # UDP message handling
│   │   ├── mqtt.cpp          # MQTT communication
│   │   ├── matrix.cpp        # Matrix LED support
│   │   └── effects/          # LED effects
│   └── platformio.ini        # PlatformIO configuration
├── mame/                       # MAME integration
│   ├── lua/                   # Lua scripts
│   │   ├── rgfx.lua          # Main entry point
│   │   ├── event.lua         # Event logging
│   │   └── interceptors/     # Game-specific scripts
│   ├── launch.sh             # MAME launcher
│   └── docs/                 # MAME documentation
└── todo.txt                    # Project task tracking
```

---

## Glossary

- **RGFX Hub** - Central controller that monitors games and orchestrates LED effects
- **RGFX Driver** - ESP32-based device that controls physical LED hardware
- **LED Device** - Named physical LED hardware (strip or matrix) connected to a Driver
- **Event** - Game state change extracted by emulator script (e.g., "player/score/p1")
- **Effect** - LED animation pattern (e.g., pulse, sparkle, fire, wave)
- **Mapping** - Configuration linking game events to LED effects on specific devices
- **Down-sampling** - Rendering at high resolution and reducing to physical LED count
- **Serpentine** - Zigzag wiring pattern common in LED matrices
- **mDNS** - Multicast DNS for zero-configuration device discovery
- **OTA** - Over-the-Air firmware update
- **NVS** - Non-Volatile Storage on ESP32 for configuration persistence
