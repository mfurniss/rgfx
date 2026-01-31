# Driver Config Components

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This directory contains extracted components, hooks, and utilities for the Driver Configuration page. The refactoring reduces the main page from 575 lines to ~190 lines by separating concerns.

---

## Directory Structure

```
driver-config/
├── CLAUDE.md                     # This file
├── index.ts                      # Public exports
├── components/
│   ├── identity-section.tsx      # Driver ID and MAC address fields
│   ├── settings-section.tsx      # Description and remote logging fields
│   └── led-config-section.tsx    # All LED configuration fields
├── hooks/
│   └── use-led-hardware.ts       # Hook to load LED hardware options
└── utils/
    └── led-config-helpers.ts     # Helper functions for LED config
```

---

## Components

### IdentitySection

**File:** [components/identity-section.tsx](components/identity-section.tsx)

**Purpose:** Renders the Identity form section with Driver ID (editable) and MAC Address (read-only).

**Props:**
- `control` - react-hook-form Control object
- `errors` - Form validation errors

---

### SettingsSection

**File:** [components/settings-section.tsx](components/settings-section.tsx)

**Purpose:** Renders the Settings form section with Description and Remote Logging fields.

**Props:**
- `control` - react-hook-form Control object
- `errors` - Form validation errors

---

### LedConfigSection

**File:** [components/led-config-section.tsx](components/led-config-section.tsx)

**Purpose:** Renders the complete LED Configuration section including:
- Hardware selector dropdown
- GPIO pin, LED offset, reverse direction toggle (strips only)
- Brightness limit, power settings, dithering toggle
- Gamma correction (R/G/B)
- Floor cutoff (R/G/B)
- RGBW mode selector (for 4-channel hardware)
- Single-panel rotation selector (for matrices without unified layout)
- Unified panel editor (for matrices)

**Props:**
- `control` - react-hook-form Control object
- `watch` - react-hook-form watch function
- `setValue` - react-hook-form setValue function
- `ledHardwareOptions` - Array of available hardware refs
- `selectedHardware` - Currently selected LEDHardware object (or null)
- `loadingHardware` - Boolean indicating if hardware list is loading
- `isStrip` - Boolean indicating if selected hardware is a strip layout
- `chipModel` - Optional chip model from driver telemetry for board-specific GPIO pin validation

---

## Hooks

### useLedHardware

**File:** [hooks/use-led-hardware.ts](hooks/use-led-hardware.ts)

**Purpose:** Loads available LED hardware options on mount via `window.rgfx.getLEDHardwareList()`.

**Returns:**
- `options` - Array of hardware reference strings
- `loading` - Boolean indicating loading state

---

## Utils

### led-config-helpers.ts

**File:** [utils/led-config-helpers.ts](utils/led-config-helpers.ts)

**Functions:**

| Function | Purpose |
|----------|---------|
| `getHardwareDisplayName(ref)` | Extracts display name from hardware ref (e.g., "led-hardware/foo.json" → "foo") |
| `isRGBWHardware(hardware)` | Checks if hardware has 4-channel RGBW color order |
| `normalizeLedConfig(config)` | Ensures ledConfig has all required nested fields with defaults for gamma/floor |

---

## Usage

Import from the index file:

```tsx
import {
  IdentitySection,
  SettingsSection,
  LedConfigSection,
  useLedHardware,
  normalizeLedConfig,
} from './driver-config';
```
