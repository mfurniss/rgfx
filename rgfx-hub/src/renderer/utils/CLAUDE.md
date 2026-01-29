# Renderer Utilities

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Utility functions for the renderer process (React UI).

## Files

### binary.ts

Binary data conversion utilities.

- `arrayBufferToBinaryString(buffer)`: converts ArrayBuffer to string (byte → char code)
- `sha256(data)`: calculates SHA-256 hash using Web Crypto API

Used for firmware integrity verification.

### formatters.ts

Human-readable formatting functions using date-fns.

- `formatBytes(bytes)`: "1.5 MB", "512 KB"
- `formatUptime(ms)`: "2d 5h 30m 15s", always includes seconds
- `formatTimestamp(timestamp)`: "5m ago", "2h ago" (short format)
- `formatNumber(value)`: locale-aware thousands separators
- `formatTableRow(label, value, suffix?)`: Create [label, formatted-value] tuples for InfoSection rows

Custom short locale converts verbose date-fns output to compact format ("5 minutes" → "5m").

### zod-introspection.ts

Zod schema inspection for dynamic UI generation (FX Playground).

Extracts field metadata from effect schemas to auto-generate form controls:

- **FieldType**: `enum`, `boolean`, `number`, `color`, `centerXY`, `spritePreset`
- Unwraps `ZodDefault` and `ZodOptional` wrappers
- Extracts constraints (min/max for numbers, enum values)
- Detects special union types:
  - Color: `namedColors | hexString | number`
  - CenterXY: `'random' | number`
  - SpritePreset: `string[]`

Key export:
```typescript
extractFieldMetadata(schema: ZodObject): FieldMetadata[]
```

## Notes

- These utilities are renderer-only (no Node.js APIs)
- zod-introspection works with Zod 4 internal structure (`_zod.def`)
