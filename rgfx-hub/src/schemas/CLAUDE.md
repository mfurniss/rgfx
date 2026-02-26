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
`LEDHardwareSchema` - Validates LED hardware definition files from the `led-hardware/` directory. Defines physical LED products (SKU, layout, count, chipset, color order). Supported chipsets: WS2812B, WS2811, SK6812, WS2814. Note: `name` was removed - hardware is identified by its filename.

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

### effects/defaults.json
Single source of truth for all effect property defaults. Consumed by Zod schemas at compile time and by the C++ header generator (`npm run generate:defaults`). Hub test suite verifies the committed C++ header stays in sync.

### effects/index.ts
- `effectSchemas` - Map of effect names to their Zod schemas
- `isEffectName()` - Type guard for valid effect names
- `safeValidateEffectProps()` - Validates props for a given effect type
- Per-effect `randomize()` functions exported for Effects Playground
- `effectCodeGenerators` - Map of effect names to custom `CodeGenerator` functions (bypass generic broadcast template)
- `effectCodePropsTransforms` - Map of effect names to `CodePropsTransform` functions (strip no-op default props before code gen)
- `effectFormDefaults` - Map of effect names to form-only default overrides (merged on top of schema defaults in the playground UI, not sent on the wire)

### effects/preset-config.ts
Schema for effect preset configurations, used by preset selector modal.

### effects/properties/
Reusable property schemas shared across effects (kebab-case filenames):
- `index.ts` - Re-exports all property schemas
- `base.ts` - Base schema all effects extend (`color`, `reset`)
- `color.ts` - RGB color validation with empty string handling
- `center-x.ts` / `center-y.ts` - Center point for radial effects
- `easing.ts` - Animation easing function names
- `clean-props.ts` - `removeDefaultNoOps()` and `createNoOpCleaner()` utilities for stripping no-op default props from generated code

Note: `color-gradient.ts` was removed - gradient colors are now in effect schemas directly.

### Effect Schemas
Each effect has its own schema extending `baseEffect` (kebab-case filenames):
- `background.ts` - Gradient-only background (color field removed, uses gradient array)
- `bitmap.ts` - Display a bitmap image with animation frames on the LED matrix. Exports `cleanCodeProps` (strips reset:false, endX/endY:'random', easing when no movement), `generateCode` (GIF-specific code gen), `formDefaults` (endX/endY default to 'random' in playground form only), and `layoutConfig` (custom row-based layout).
- `explode.ts` - Particle explosion with hueSpread, radiusScale, and per-effect randomize. Exports `cleanCodeProps` (strips reset:false, gravity:0, hueSpread:0).
- `particle-field.ts` - Particle field effect with configurable behavior
- `plasma.ts` - Perlin noise plasma with gradient colors
- `projectile.ts` - Moving rectangle with direction, velocity, friction, trail, and watchdog. Exports `cleanCodeProps` (strips reset:false, particleDensity:0).
- `pulse.ts` - Full-screen color pulse with fade and collapse options. Exports `cleanCodeProps` (strips reset:false).
- `scroll-text.ts` - Horizontally scrolling text with gradient (y property removed, auto-centered). Exports `scrollTextBaseSchema` for `.omit()` operations (Zod 4 doesn't allow `.omit()` on refined schemas). Exports `cleanCodeProps` (strips reset:true, accentColor:null, repeat:false, snapToLed:true).
- `text.ts` - Static text rendering with gradient and optional accent color (defaults to null/no accent). `reset` defaults to `false` (preserve existing text). `gradientScale` supports negative values (-20 to 20) to reverse gradient direction. Exports `cleanCodeProps` (strips reset:false, accentColor:null).
- `warp.ts` - Center-radiating animated gradient with linear perspective scale. Uses `enabled` enum with fade support.
- `wipe.ts` - Color wipe sweeping across the display with random blend mode option. Exports `cleanCodeProps` (strips reset:false).
- `sparkle.ts` - Sparkling particles cycling through a gradient with bloom support. Exports `cleanCodeProps` (strips reset:false).

### Per-Effect Randomize Functions
Each effect schema exports a `randomize()` function that generates randomized props:
```typescript
import { randomizeExplode } from './schemas/effects/explode';
const props = randomizeExplode(); // Returns randomized explode props
```

## Design Patterns

- **Schema Composition**: Larger schemas are composed from smaller ones using `.pick()`, `.extend()`, and `.merge()`
- **Strict Mode**: Effect schemas use `.strict()` to reject unknown properties
- **Shared Defaults**: All effect defaults live in `effects/defaults.json` (single source of truth). Zod schemas import this JSON directly for `.default()` values. A generator script (`scripts/generate-effect-defaults.mjs`) produces the ESP32 C++ header from the same file.
- **Type Export**: Each schema exports inferred TypeScript types via `z.infer<>`
- **Kebab-Case Filenames**: All effect files use kebab-case (enforced by eslint-plugin-check-file)
- **Shared Constants**: Gradient array schemas use `HEX_COLOR_RRGGBB_REGEX` from `@/config/constants`

<\!-- No per-file license headers — see root LICENSE -->
