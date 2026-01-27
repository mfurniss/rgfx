# RGFX Public Documentation

## CRITICAL REQUIREMENTS

**Documentation accuracy is paramount.** Every page in this documentation must be technically accurate and reflect the current state of the RGFX codebase.

### Before Making Documentation Changes

1. **Verify against source code** - Never document features based on assumptions. Always read the actual implementation in:
   - `/rgfx-hub/src/` for Hub features
   - `/esp32/src/` for ESP32 driver features
   - `/rgfx-hub/assets/interceptors/` and `/rgfx-hub/assets/mame/` for MAME integration

2. **Cross-reference architecture docs** - Consult `/.claude/docs/architecture.md` for system design context

3. **Test examples** - Any code examples must be verified to work with the current implementation

### Documentation Standards

- Use precise technical terminology
- Include actual configuration options with correct defaults
- Document all parameters, not just common ones
- Show real examples from the codebase when possible
- Keep API references synchronized with actual function signatures

### Current Documentation Gaps

The following sections need expansion to cover ALL features:

1. **Drivers section** (`/drivers/index.md`) - Currently a stub. Needs:
   - All 13 LED effect types with parameters
   - MQTT topics and message formats
   - LED hardware configuration (strips, matrices, unified panels, RGBW)
   - OTA update process
   - Telemetry and status reporting
   - Gamma correction and power management
   - Multi-core architecture overview

2. **Transformers section** (`/transformers/index.md`) - Currently a stub. Needs:
   - Transformer cascade precedence (game → subject → pattern → default)
   - Context object API (log, drivers, mqtt, udp, store)
   - Hot-reload behavior
   - Example transformers

3. **Getting Started** (`/overview/getting-started.md`) - Empty. Needs:
   - Installation steps
   - First-time setup walkthrough
   - MAME configuration
   - ESP32 flashing instructions

### When Adding New Features

If you implement a new feature in the codebase, you MUST update the corresponding documentation page. Undocumented features are bugs.

### Feature Reference

For comprehensive feature lists to document, see the exploration results from:
- ESP32 driver: 13 effects, dual-core architecture, MQTT/UDP protocols, OTA, telemetry
- RGFX Hub: Event processing, device discovery, transformer engine, IPC handlers
- MAME Integration: RAM monitoring, ambilight, FFT audio, 9+ game interceptors
