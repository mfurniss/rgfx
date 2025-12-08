# Schemas Module

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

### driver-persistence.ts
Schemas for persisting driver configuration to disk:
- `UnifiedPanelLayoutSchema` - 2D array defining LED panel physical layout
- `DriverLEDConfigSchema` - LED strip/matrix configuration (pin, brightness, power limits)
- `PersistedDriverSchema` - Full driver config (ID, MAC, LED config, remote logging level)
- `DriversConfigFileRawSchema` - File format for `drivers.json`

### led-hardware.ts
`LEDHardwareSchema` - Validates LED hardware definition files from the `led-hardware/` directory. Defines physical LED products (name, SKU, layout, count, chipset, color order).

### firmware-manifest.ts
`FirmwareManifestSchema` - Validates firmware manifest files for USB serial flashing. Contains version, file list with addresses, sizes, and SHA256 checksums.

## effects/ Subdirectory

Effect property schemas for LED visual effects sent to drivers.

### effects/index.ts
- `effectSchemas` - Map of effect names to their Zod schemas
- `isEffectName()` - Type guard for valid effect names
- `safeValidateEffectProps()` - Validates props for a given effect type

### effects/properties/
Reusable property schemas shared across effects:
- `index.ts` - Re-exports all property schemas
- `base.ts` - Base schema all effects extend (`color`, `reset`)
- `color.ts` - RGB color validation
- `centerX.ts` / `centerY.ts` - Center point for radial effects
- `easing.ts` - Animation easing function names

### Effect Schemas
Each effect has its own schema extending `baseEffect`:
- `pulse.ts` - Full-screen color pulse with fade and collapse options
- `wipe.ts` - Color wipe sweeping across the display
- `explode.ts` - Particle explosion from a center point
- `bitmap.ts` - Display a bitmap image on the LED matrix

## Design Patterns

- **Schema Composition**: Larger schemas are composed from smaller ones using `.pick()`, `.extend()`, and `.merge()`
- **Strict Mode**: Effect schemas use `.strict()` to reject unknown properties
- **Defaults**: Schemas define sensible defaults where appropriate
- **Type Export**: Each schema exports inferred TypeScript types via `z.infer<>`
