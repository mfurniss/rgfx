# Global Configuration

The `global.js` file defines driver constants and configurations shared across transformers.

**Location:** `~/.rgfx/transformers/global.js`

## Driver Groups

```javascript
import { MATRIX_DRIVERS, STRIP_DRIVERS, ALL_DRIVERS } from '../global.js';
```

| Constant | Description |
|----------|-------------|
| `MATRIX_DRIVERS` | Array of matrix driver IDs |
| `STRIP_DRIVERS` | Array of strip driver IDs |
| `ALL_DRIVERS` | Combined array of all driver IDs |

## Named Drivers

Reference drivers by logical name instead of ID:

```javascript
import { NAMED_DRIVERS } from '../global.js';

broadcast({
  effect: 'pulse',
  drivers: [NAMED_DRIVERS.primaryMatrix],
  props: { color: '#FF0000' }
});
```

Configure your driver names to match your physical setup:

```javascript
export const NAMED_DRIVERS = {
  frontStrip: 'rgfx-driver-0004',
  leftStrip: 'rgfx-driver-0006',
  rightStrip: 'rgfx-driver-0003',
  primaryMatrix: 'rgfx-driver-0005',
  leftMatrix: 'rgfx-driver-0001',
  rightMatrix: 'rgfx-driver-0002',
};
```

## Ambilight Configuration

Configure how ambilight effects map to your drivers:

```javascript
export const AMBILIGHT_CONFIG = {
  mode: 'multi', // 'multi' or 'single'

  // Multi-driver mode: each screen edge to separate driver
  multiDriver: {
    top: 'rgfx-driver-0004',
    left: 'rgfx-driver-0006',
    right: 'rgfx-driver-0003',
  },

  // Single-driver mode: all edges to one continuous strip
  singleDriver: {
    drivers: ['rgfx-driver-0004'],
    startCorner: 'bottom-left',
    aspectRatio: [16, 10],
  },
};
```

### Multi-Driver Mode

Each screen edge sends to a separate driver. Use this when you have individual LED strips on each side of your display.

### Single-Driver Mode

All edges combine into one continuous strip. Configure the starting corner and aspect ratio to match your physical layout.

| Option | Description |
|--------|-------------|
| `startCorner` | Where the strip begins: `bottom-left`, `top-left`, `top-right`, `bottom-right` |
| `aspectRatio` | Screen dimensions as `[width, height]` for proper edge proportions |
