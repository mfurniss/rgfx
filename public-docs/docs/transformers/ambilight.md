# Ambilight Transformer

The ambilight transformer converts screen edge color events into LED gradient effects, creating ambient lighting that matches what's displayed on screen.

**Location:** `transformers/subjects/ambilight.js` in your [config directory](../getting-started/hub-setup.md#config-directory)

## How It Works

The MAME ambilight interceptor samples colors along each screen edge and publishes them as events:

```
rgfx/ambilight/frame  F00,0F0,00F|...|...|...
```

The payload contains four pipe-separated segments (left, top, right, bottom), each with comma-separated 12-bit colors sampled along that edge.

The transformer parses these colors and broadcasts `background` effects with gradients to your LED strips.

## Configuration

Configure ambilight behavior in `transformers/global.js` (see [Global Configuration](global.md)):

```javascript
export const AMBILIGHT_CONFIG = {
  mode: 'multi', // 'multi' or 'single'

  multiDriver: {
    top: 'rgfx-driver-0004',
    left: 'rgfx-driver-0006',
    right: 'rgfx-driver-0003',
  },

  singleDriver: {
    drivers: ['rgfx-driver-0004'],
    startCorner: 'bottom-left',
    aspectRatio: [16, 10],
  },
};
```

## Single-Driver Mode

All edges combine into one continuous gradient on a single strip. Use this when you have one LED strip running around the entire perimeter of your display.

```javascript
mode: 'single',
singleDriver: {
  drivers: ['rgfx-driver-0004'],
  startCorner: 'bottom-left',
  aspectRatio: [16, 10],
},
```

| Option | Description |
|--------|-------------|
| `drivers` | Array of driver IDs to receive the combined gradient |
| `startCorner` | Where your strip begins: `bottom-left`, `top-left`, `top-right`, `bottom-right` |
| `aspectRatio` | Screen dimensions as `[width, height]` for proper edge proportions |

The aspect ratio ensures horizontal edges (top/bottom) receive proportionally more colors than vertical edges (left/right), matching the physical layout of LEDs around a widescreen display.

## Multi-Driver Mode

Each screen edge broadcasts to a separate LED strip. Use this when you have long strips mounted around the room, where each strip covers one direction.

```javascript
mode: 'multi',
multiDriver: {
  top: 'rgfx-driver-0004',    // Strip above screen
  left: 'rgfx-driver-0006',   // Strip on left side
  right: 'rgfx-driver-0003',  // Strip on right side
  // bottom: 'rgfx-driver-0007', // Optional bottom strip
},
```

Each edge receives its own gradient based on the sampled colors from that portion of the screen. Since ambilight sets the `background` effect, these strips can still display foreground effects (score flashes, hit indicators, etc.) simultaneously.

## Effect Output

The transformer broadcasts `background` effects with gradient data:

```javascript
{
  effect: 'background',
  props: {
    gradient: {
      colors: ['#FF0000', '#00FF00', '#0000FF', ...],
      orientation: 'horizontal'  // 'vertical' for left/right edges
    },
    fadeDuration: 200
  },
  drivers: ['rgfx-driver-0004']
}
```

The 200ms fade duration smooths transitions between frames.
