# Renderer Utilities

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Utility functions for the renderer process (React UI).

## Files

### binary.ts

Binary data utilities for firmware integrity verification.

- `sha256(data)`: calculates SHA-256 hash using Web Crypto API

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
- Extracts constraints (min/max for numbers, enum values) from Zod v4 schema-like check wrappers (`_zod.def.check` format)
- Detects special union types:
  - Color: `namedColors | hexString | number`
  - CenterXY: `'random' | number`
  - SpritePreset: `string[]`

Key export:
```typescript
extractFieldMetadata(schema: ZodObject): FieldMetadata[]
```

### color.ts

Color utilities for hex color validation and conversion.

- `colorSwatchMap`: Maps named colors to hex values
- `isValidHex(value)`: Validates #RRGGBB hex color strings using `HEX_COLOR_RRGGBB_REGEX` from constants
- `normalizeHex(value)`: Normalizes various hex formats to #RRGGBB
- `valueToHex(value)`: Converts color values (number, named, hex) to #RRGGBB

## Notes

- These utilities are renderer-only (no Node.js APIs)
- zod-introspection works with Zod 4 internal structure (`_zod.def`)
- color.ts imports `HEX_COLOR_RRGGBB_REGEX` from `@/config/constants`

<\!-- No per-file license headers — see root LICENSE -->
