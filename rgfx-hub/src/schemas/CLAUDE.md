# Schemas Module

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This module contains [Zod](https://zod.dev/) schemas for validating data structures used throughout RGFX Hub. All schemas provide runtime validation and TypeScript type inference.

## Files

### index.ts
Public exports for all schemas and types.

### telemetry-payload.ts
`TelemetryPayloadSchema` - Validates telemetry data sent by ESP32 drivers via the `rgfx/system/driver/telemetry` MQTT topic. Includes network info, runtime metrics, and hardware details.

### driver-telemetry.ts
`DriverTelemetrySchema` - A subset of telemetry focused on hardware/firmware information (chip model, flash size, firmware version, etc.). Stored in `Driver.telemetry`.

### driver-registration.ts
`DriverRegistrationSchema` - Combines network info, runtime metrics, and telemetry for the `registerDriver()` function. Composed from `TelemetryPayloadSchema.pick()`.

### minimal-driver-registration.ts
`MinimalDriverRegistrationSchema` - Backward compatibility schema for old firmware drivers. Only requires IP and MAC address; all other fields optional. Used as fallback when full validation fails.

### driver-config.ts
Schemas for driver configuration:
- `UnifiedPanelLayoutSchema` - 2D array defining LED panel physical layout with per-panel rotation
- `DriverLEDConfigSchema` - LED strip/matrix configuration (pin 0-48 to accommodate all ESP32 variants, brightness, power limits, rgbwMode for RGBW strips, rotation for single-panel virtual rotation)
- `ConfiguredDriverSchema` - Full driver config (ID, MAC, LED config, remote logging level)
- `DriversConfigFileRawSchema` - File format for `drivers.json`

### led-hardware.ts
`LEDHardwareSchema` - Validates LED hardware definition files from the `led-hardware/` directory. Defines physical LED products (SKU, layout, count, chipset, color order). Note: `name` was removed - hardware is identified by its filename.

### firmware-manifest.ts
`FirmwareManifestSchema` - Validates firmware manifest files for USB serial and OTA flashing. Supports multi-chip firmware with per-variant versioning, allowing different chip types to be built at different times without causing false "update needed" notifications.

**Exports:**
- `SUPPORTED_CHIPS` - Array of supported chip types: `['ESP32', 'ESP32-S3']`
- `SupportedChip` - Type alias for supported chip names
- `FirmwareManifestSchema` - Validates manifest structure with `generatedAt` and `variants` object (each variant has its own `version`)
- `mapChipNameToVariant(chipName)` - Maps chip model names (e.g., "ESP32-D0WD-V3", "ESP32-S3-WROOM-1") to supported variant keys
- `getOtaFirmwareFilename(chipType)` - Returns OTA firmware filename for a chip type (e.g., "firmware-esp32.bin")

**Manifest Structure:**
```json
{
  "generatedAt": "...",
  "variants": {
    "ESP32": { "version": "0.1.0-dev+abc123", "files": [...] },
    "ESP32-S3": { "version": "0.1.0-dev+def456", "files": [...] }
  }
}
```

Each variant tracks its own version independently. When comparing driver firmware, the hub uses the version from the matching chip variant, not a global version.

## effects/ Subdirectory

Effect property schemas for LED visual effects sent to drivers.

### effects/index.ts
- `effectSchemas` - Map of effect names to their Zod schemas
- `isEffectName()` - Type guard for valid effect names
- `safeValidateEffectProps()` - Validates props for a given effect type
- Per-effect `randomize()` functions exported for Effects Playground

### effects/preset-config.ts
Schema for effect preset configurations, used by preset selector modal.

### effects/properties/
Reusable property schemas shared across effects (kebab-case filenames):
- `index.ts` - Re-exports all property schemas
- `base.ts` - Base schema all effects extend (`color`, `reset`)
- `color.ts` - RGB color validation with empty string handling
- `center-x.ts` / `center-y.ts` - Center point for radial effects
- `easing.ts` - Animation easing function names

Note: `color-gradient.ts` was removed - gradient colors are now in effect schemas directly.

### Effect Schemas
Each effect has its own schema extending `baseEffect` (kebab-case filenames):
- `background.ts` - Gradient-only background (color field removed, uses gradient array)
- `bitmap.ts` - Display a bitmap image with animation frames on the LED matrix
- `explode.ts` - Particle explosion with hueSpread, radiusScale, and per-effect randomize
- `particle-field.ts` - Particle field effect with configurable behavior
- `plasma.ts` - Perlin noise plasma with gradient colors
- `projectile.ts` - Moving rectangle with direction, velocity, friction, trail, and watchdog
- `pulse.ts` - Full-screen color pulse with fade and collapse options
- `scroll-text.ts` - Horizontally scrolling text with gradient (y property removed, auto-centered). Exports `scrollTextBaseSchema` for `.omit()` operations (Zod 4 doesn't allow `.omit()` on refined schemas)
- `text.ts` - Static text rendering with gradient and optional accent color (defaults to null/no accent)
- `warp.ts` - Center-radiating animated gradient with linear perspective scale. Uses `enabled` enum with fade support.
- `wipe.ts` - Color wipe sweeping across the display with random blend mode option
- `sparkle.ts` - Sparkling particles cycling through a gradient with bloom support

### Per-Effect Randomize Functions
Each effect schema exports a `randomize()` function that generates randomized props:
```typescript
import { randomizeExplode } from './schemas/effects/explode';
const props = randomizeExplode(); // Returns randomized explode props
```

## Design Patterns

- **Schema Composition**: Larger schemas are composed from smaller ones using `.pick()`, `.extend()`, and `.merge()`
- **Strict Mode**: Effect schemas use `.strict()` to reject unknown properties
- **Defaults**: Schemas define sensible defaults where appropriate
- **Type Export**: Each schema exports inferred TypeScript types via `z.infer<>`
- **Kebab-Case Filenames**: All effect files use kebab-case (enforced by eslint-plugin-check-file)
- **Shared Constants**: Gradient array schemas use `HEX_COLOR_RRGGBB_REGEX` from `@/config/constants`
