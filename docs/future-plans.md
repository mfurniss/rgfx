# RGFX Future Plans

**Status**: Vision/Future Work Only - Not Current Features

This document outlines the long-term vision for RGFX's evolution from a specialized arcade LED controller to a universal event-driven lighting platform.

---

## Executive Summary

RGFX will evolve from a purpose-built arcade game LED controller into a **universal event-to-visual platform** - a plugin-based system that routes events from any source to any lighting device through simple configuration.

### Vision Statement

**"RGFX becomes the Zapier for LED lighting"** - connecting any event source to any lighting system through a clean plugin architecture, while maintaining the low-latency, high-performance core that makes it superior for real-time applications.

---

## Current State (v1.0)

### What RGFX Is Today

**Specific Use Case**: Arcade game LED effects
- MAME Lua scripts monitor game state
- Hub reads events and orchestrates effects
- ESP32 drivers control LED hardware
- Low-latency (15-25ms), dual-core architecture
- Clean Hub-Driver separation

### Core Technical Advantages

**vs WLED and Similar Systems:**

1. **Ultra-Low Latency**: 15-25ms (vs WLED's 50-100ms)
2. **Dual-Core Architecture**: Explicit Core 0 (network) / Core 1 (LED) separation
3. **Zero WiFi Interference**: No LED flicker from network operations
4. **Minimal Memory**: 10-15KB footprint (vs WLED's 40-50KB)
5. **Clean Codebase**: 1,200 lines (vs WLED's 40,000+)
6. **Deterministic Performance**: Consistent 120 FPS
7. **Simple Architecture**: Message-based, no shared state
8. **Hub-Driver Model**: Centralized orchestration, distributed rendering

These advantages position RGFX uniquely for real-time, performance-critical applications.

---

## Future Vision: Universal Event Platform

### Architecture Evolution

**Current (Specific)**:
```
MAME → Event File → Hub → Drivers → LEDs
```

**Future (General)**:
```
[Input Plugin] → [RGFX Core] → [Output Plugin]
```

### The Platform Model

**RGFX Core** becomes a lightweight event router:
- Plugin lifecycle management
- Event bus for message routing
- Configuration system
- UI framework
- **Zero domain knowledge** - no game logic, no LED logic, no protocol implementations

**Input Plugins** (Event Producers):
- File Reader (watches any file for events)
- MAME Monitor (game state changes)
- Media Sync (video timeline events)
- Music Analysis (beat detection, tempo)
- Home Automation (Home Assistant, webhooks)
- Sports APIs (scores, game events)
- Stream Alerts (Twitch, YouTube)
- System Monitoring (logs, metrics)
- Calendar/Time (schedule-based events)

**Output Plugins** (Event Consumers):
- ESP32 Driver (current RGFX hardware)
- Philips Hue (bridge API integration)
- LIFX (LAN/cloud API)
- WLED Devices (JSON API, E1.31)
- Govee (Bluetooth, API)
- Nanoleaf (local API)
- DMX Controllers (Art-Net, sACN)
- Razer Chroma (SDK)
- Discord/Slack (webhooks)
- Home Assistant (MQTT)

### Complete Decoupling

**Key Architectural Decision**: MAME Lua scripts become completely independent of RGFX.

**Current**: MAME scripts know about RGFX event format
**Future**: MAME scripts write generic game events, RGFX reads via File Reader plugin

**Benefits**:
- MAME scripts usable by any system (not just RGFX)
- RGFX has zero MAME knowledge
- Connection happens through configuration only
- Other emulators can adopt same event format

**Example Generic Event Format**:
```
game pacman
score 1000
lives 3
powerup true
ghost.eaten blinky
level.complete 1
```

Configuration maps events to effects - no code changes needed.

---

## Plugin Architecture Vision

### Two Plugin Types

**Input Plugins** - Produce events:
- Watch files, API endpoints, sensors, etc.
- Parse data into standardized event format
- Emit events to RGFX event bus
- Handle own authentication, protocols, errors

**Output Plugins** - Consume events:
- Receive events from RGFX event bus
- Translate to device-specific protocols
- Handle device communication, discovery
- Manage connection state, retries

### Plugin Communication Contract

**Simple Event Format**:
```json
{
  "source": "plugin.mame",
  "timestamp": 1234567890,
  "event": "pulse",
  "data": {
    "color": "#FF0000",
    "intensity": 100,
    "duration": 500
  }
}
```

**Configuration-Driven Mapping**:
```json
{
  "mappings": [
    {
      "pattern": "score *",
      "output": {
        "event": "pulse",
        "color": "#FFFF00"
      }
    }
  ]
}
```

### Eating Our Own Dog Food

**Current features become plugins**:
- `rgfx-input-file-reader` - Generic file watcher
- `rgfx-input-mame` - MAME-specific configuration for file reader
- `rgfx-output-esp32` - Current driver communication
- Core has zero knowledge of MAME or ESP32

**All plugins use same APIs**:
- No special privileges for "official" plugins
- Community plugins use identical interfaces
- Third-party code never merged into core

### Plugin Distribution

**Package Structure**:
- npm packages (e.g., `@rgfx/input-spotify`)
- Independent repositories
- Separate versioning and release cycles
- Plugin authors maintain their own code

**Plugin Ecosystem**:
- Official plugins (RGFX team maintained)
- Verified community plugins
- Commercial plugins (paid advanced features)
- Private plugins (corporate/proprietary)

---

## Expanded Use Cases

### Beyond Arcade Gaming

**Home Automation**:
```
Weather API → Storm warning → All lights pulse red
Doorbell → Specific lights pulse blue
Calendar → Meeting starting → Dim office lights
```

**Content Creation**:
```
Stream alerts → LED reactions
Game telemetry → Room lighting sync
Music beats → Whole room visualization
```

**Media Sync** (Like "Subtitles for Effects"):
```
Movie timeline file (.rgfx format):
00:15:43.120 pulse {"color": "#FF0000"}  # Explosion
00:45:23.000 fire {"intensity": 255}      # Building fire
01:23:00.000 wave {"speed": 100}          # Chase scene
```

**System Monitoring**:
```
Log files → Error messages → Red alert
CPU usage > 95% → Orange pulse
Deployment success → Green wave
```

**Retail/Commercial**:
```
Sales system → Purchase → Celebration effect
Queue system → Next customer → Direction indicators
Emergency → Evacuation → Exit path lighting
```

---

## Evolution Strategy

### Philosophy: Specific to General

**Not Building**: Generic platform first
**Instead Building**: Perfect arcade solution that happens to have great architecture

### Phased Approach

**Phase 1: Perfect the Arcade Use Case** ← CURRENT FOCUS
- Nail MAME integration
- Build solid effect library
- Create compelling demos
- Prove architecture with real users
- Build small community

**Phase 2: Architectural Preparation**
- Extract features to internal "plugins"
- Define stable plugin APIs
- Make configuration more flexible
- Document extension points

**Phase 3: Plugin System**
- Formalize plugin interfaces
- Create plugin SDK
- Build plugin manager UI
- Establish plugin registry

**Phase 4: Ecosystem Growth**
- Community plugin development
- Third-party integrations
- Commercial plugin marketplace
- Enterprise features

### Demand-Driven Evolution

**When to evolve to platform**:
- Users asking for non-MAME inputs
- Community building unofficial integrations
- Clear patterns in feature requests
- Saying "no" to good ideas due to scope

**Not yet time when**:
- Still perfecting core use case
- Architecture still evolving
- User base still small
- No clear second use case

Let user demand pull you forward, don't push complexity nobody needs yet.

---

## Technical Readiness Assessment

### ✅ Architecture Already Plugin-Ready

**Current Strengths**:
1. **Message-Based Communication** - No direct function calls between components
2. **Protocol Abstraction** - UDP/MQTT are just transport layers
3. **Hub-Driver Separation** - Clean boundary between orchestration and execution
4. **Event-Based Design** - Already using message passing
5. **Configuration-Driven** - Behavior in config files, not hardcoded
6. **Modular Codebase** - Clear separation of concerns
7. **No Shared Memory** - Components communicate via messages only

### ⚠️ Minor Adjustments Needed

**EventFileReader**:
- Currently hardcoded to MAME event file
- Path Forward: Extract to FileReaderPlugin with configurable paths
- No architectural change needed, just refactoring

**Game-Specific Types**:
- Some TypeScript types assume game context
- Path Forward: Generalize to "source" and "event"
- Mostly naming/semantic changes

**MQTT Broker Embedded**:
- Aedes broker tightly integrated
- Path Forward: Make broker optional
- Some plugins might not need MQTT

### ✅ No Fundamental Blockers

**Migration Path is Clear**:
- No rewrites needed
- Just evolutionary refactoring
- Extract existing features using existing patterns
- 80% ready for plugins now

**Example Evolution** (EventFileReader):
1. Current: Watches MAME file
2. Step 1: Make file path configurable
3. Step 2: Extract to separate module
4. Step 3: Define plugin interface
5. Step 4: Load as plugin
6. Done: Same functionality, now pluggable

---

## Technical Debt Prevention

### Keeping Architecture Clean

**When Adding New Features, Ask**:
1. Could this be a plugin?
2. Does core need to know about this?
3. Am I hardcoding domain knowledge?
4. Can this work without RGFX?

### Design Principles

**Keep Doing**:
- Event-based communication
- Protocol agnostic design
- Configuration over code
- Clean module boundaries

**Start Doing**:
- Design new features as "future plugins"
- Keep core minimal
- Avoid domain-specific logic in core
- Think "platform" not "application"

**Stop Doing**:
- Adding game-specific features to core
- Hardcoding file paths or protocols
- Creating tight couplings

### Avoiding WLED's Mistakes

**WLED's Issues** (What NOT to do):
- Monolithic architecture with 40,000+ lines
- 100+ effects in single file
- Multiple protocols competing for CPU
- WiFi interference causing LED flicker
- Complex memory management with fixed arrays
- Impossible to refactor without breaking everything

**RGFX's Approach**:
- Keep core tiny and stable
- Features via plugins
- Explicit dual-core separation
- Clean boundaries
- Can evolve without breaking changes

---

## Success Metrics

### Phase 1: Arcade Use Case (Current)

**Technical Metrics**:
- <25ms latency maintained
- Zero dropped events
- 99.9% uptime
- Support 10+ games
- 120 FPS stable

**User Metrics**:
- 10-minute setup time
- Works out of box
- "Wow" reaction from users
- Users requesting specific games
- Community sharing configs

**Community Metrics**:
- Users posting demo videos
- Contributing game interceptors
- Sharing effect mappings
- Active discussions

### Phase 2+: Platform Evolution

**Demand Signals**:
- Multiple requests for non-MAME inputs
- Community building unofficial integrations
- Clear patterns emerging
- External developers asking for plugin API

**Technical Success**:
- Stable plugin API (no breaking changes)
- Third-party plugins working
- Performance maintained with plugins
- Clean separation proven

---

## Competitive Positioning

### RGFX vs WLED

**WLED** = General-purpose LED animation controller
- 100+ effects, mature ecosystem
- Monolithic architecture, high complexity
- 40,000+ lines, technical debt
- WiFi interference issues
- 50-100ms latency
- Trapped by its own success

**RGFX** = Event-driven lighting platform
- Purpose-built with clean architecture
- 1,200 lines, no technical debt
- Dual-core isolation, no interference
- 15-25ms latency
- Free to evolve

### Market Differentiation

**WLED**: For general LED animations
**RGFX**: For event-driven, real-time lighting applications

**RGFX Unique Advantages**:
1. Performance (2-3x lower latency)
2. Reliability (no WiFi flicker)
3. Clean architecture (maintainable)
4. Platform potential (plugin ecosystem)
5. Hub orchestration (multi-device sync)

---

## The Path Forward

### Current Focus (2024-2025)

**Priority**: Make arcade LED experience amazing
- More game support
- Richer effects
- Better documentation
- Demo videos and tutorials
- Build community

**Not Priorities Yet**:
- Plugin system implementation
- General-purpose features
- Complex abstractions
- Feature requests outside arcade use case

### Future Triggers

**When These Happen, Consider Evolution**:
- Strong demand for non-MAME inputs
- Multiple community integrations appearing
- Clear second use case with users
- Plugin requests from external developers
- Current architecture limiting valuable features

### Long-Term Vision

**RGFX becomes**:
- De facto standard for event-driven lighting
- Platform with rich plugin ecosystem
- Universal translator between events and lights
- Professional tool for interactive installations
- Community-driven innovation hub

**But starts as**:
- Best arcade cabinet LED controller
- Solid, reliable, performant
- Clean architecture
- Happy users

---

## Conclusion

RGFX has the rare combination of:
1. **Clear current value** - Arcade LED effects that work beautifully
2. **Solid architecture** - Built right from the start
3. **Platform potential** - Can evolve without rewrites
4. **No technical debt** - Clean, maintainable codebase

The strategy is simple:
- **Build**: Perfect arcade solution
- **Prove**: Architecture works in production
- **Listen**: To what users want next
- **Evolve**: When demand pulls you forward

The future is plugin-based and universal, but the present is focused and specific. This balance keeps RGFX clean, valuable, and positioned for long-term success.

---

**Document Status**: Living document, updated as vision evolves
**Last Updated**: 2025-01-02
**Next Review**: After Phase 1 completion (10+ games supported, active community)
