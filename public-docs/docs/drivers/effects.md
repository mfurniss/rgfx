# Visual Effects

RGFX drivers support 12 visual effects that render on LED strips and matrices.

Use the [FX Playground](../hub-app/fx-playground.md) in the Hub to experiment with effects and see them render in real-time.

## How Effects Work

Effects are sent from the Hub to drivers as JSON commands over MQTT. The driver renders effects to an internal canvas at 4x resolution, then downsamples to the physical LED layout. Multiple effects can composite together, with the background rendering first and other effects layering on top.

## Effects Reference

### Background

Fills the entire display with a solid color or gradient. Renders first, allowing other effects to layer on top. Supports smooth cross-fading between colors.

| Parameter | Description |
|-----------|-------------|
| `gradient.colors` | Array of hex colors |
| `gradient.orientation` | `horizontal` or `vertical` |
| `fadeDuration` | Cross-fade transition time in ms (default: 1000) |

### Pulse

Pulsing color overlay that expands and contracts. Supports multiple simultaneous pulses.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `duration` | Duration in ms (default: 800) |
| `fade` | Fade out (`true`) or stay bright (`false`) |
| `easing` | Easing function (default: `quinticOut`) |
| `collapse` | Direction: `horizontal`, `vertical`, `none`, `random` |

### Bitmap

Animated sprite display with frame-based animation, movement, and fading. Uses up to 16-color palettes (defaults to PICO-8 palette).

| Parameter | Description |
|-----------|-------------|
| `images` | Array of frames, each frame is an array of row strings |
| `palette` | Array of up to 16 hex colors |
| `centerX`, `centerY` | Start position (0-100 or `random`) |
| `endX`, `endY` | End position for movement |
| `easing` | Movement easing function (default: `quadraticInOut`) |
| `fadeIn`, `fadeOut` | Fade durations in ms |
| `duration` | Total effect duration in ms (default: 1500) |
| `frameRate` | Frames per second (default: 2) |

### Wipe

Directional color sweep across the display.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `duration` | Duration in ms (default: 500) |
| `direction` | `left`, `right`, `up`, `down`, `random` |
| `blendMode` | `additive` or `replace` |

### Explode

Radial particle explosion from a center point.

| Parameter | Description |
|-----------|-------------|
| `centerX`, `centerY` | Explosion center (0-100 or `random`) |
| `color` | Hex color (required) |
| `power` | Initial particle velocity (default: 120) |
| `powerSpread` | Power variation percentage (default: 80) |
| `lifespan` | Particle lifetime in ms (default: 700) |
| `lifespanSpread` | Lifespan variation percentage (default: 50) |
| `particleCount` | Number of particles (1-500, default: 100) |
| `particleSize` | Particle size in pixels (1-16, default: 6) |
| `hueSpread` | Color variation in degrees (0-359) |
| `friction` | Air resistance (0-50, default: 3) |
| `gravity` | Vertical acceleration (-500 to 500, default: 0) |

### Projectile

Moving object with velocity and optional particle trail. Starts from screen edge.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `direction` | `left`, `right`, `up`, `down`, `random` |
| `velocity` | Speed in pixels/second (default: 1200) |
| `friction` | Deceleration (0=none, positive=slow, negative=accelerate) |
| `trail` | Trail multiplier (0=none, 1=velocity length) |
| `width`, `height` | Object size in pixels |
| `lifespan` | Max duration in ms (default: 5000) |
| `particleDensity` | Trail particle chance per frame (0-100%) |

### Text

Static text display with optional gradient animation. Matrix only.

| Parameter | Description |
|-----------|-------------|
| `text` | Text to display (max 32 chars) |
| `color` | Hex color (default: `#FFA000`) |
| `accentColor` | Optional accent/shadow color |
| `duration` | Display time in ms (0=permanent, default: 3000) |
| `gradient` | Array of hex colors for animation |
| `gradientSpeed` | Animation speed (default: 3.0) |
| `gradientScale` | Gradient pattern scale (default: 4.0) |
| `reset` | Clear existing text before rendering |

### Scroll Text

Horizontally scrolling text with gradient animation.

| Parameter | Description |
|-----------|-------------|
| `text` | Text to display (max 64 chars) |
| `color` | Hex color (default: `#808000`) |
| `accentColor` | Optional accent/shadow color |
| `speed` | Scroll speed in canvas pixels/second (default: 150) |
| `repeat` | Restart when text exits (`true`/`false`) |
| `snapToLed` | Snap to LED boundaries for smoother motion |
| `gradient` | Array of hex colors for animation |
| `gradientSpeed` | Animation speed (default: 3.0) |
| `gradientScale` | Gradient pattern scale (default: 4.0) |
| `reset` | Clear existing scroll text before adding |

### Plasma

Classic demoscene plasma effect using Perlin noise.

| Parameter | Description |
|-----------|-------------|
| `gradient` | Array of hex colors (default: rainbow) |
| `scale` | Pattern frequency (0.1-10, higher=more detail) |
| `speed` | Animation speed multiplier (0.1-20, default: 3) |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |

### Warp

Center-radiating animated gradient creating tunnel or bulge effects.

| Parameter | Description |
|-----------|-------------|
| `gradient` | Array of hex colors |
| `orientation` | `horizontal` or `vertical` |
| `speed` | Animation speed (positive=expand, negative=collapse) |
| `scale` | Perspective (0=linear, >0=3D tunnel, <0=inverted) |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |

### Particle Field

Animated particle system for starfields, rain, or snow effects. Slower particles appear dimmer to simulate distance.

| Parameter | Description |
|-----------|-------------|
| `density` | Number of active particles (1-100, default: 20) |
| `speed` | Base particle speed in pixels/second (default: 50) |
| `direction` | `up`, `down`, `left`, `right` |
| `color` | Hex color |
| `size` | Particle size in canvas pixels (1-16, default: 4) |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |

### Sparkle

Twinkling single-LED particles that cycle through a color gradient. Triggering creates a "cloud" that spawns particles over its duration.

| Parameter | Description |
|-----------|-------------|
| `gradient` | Colors to cycle through (min 2 colors) |
| `duration` | Duration in ms (0=infinite, default: 3000) |
| `density` | Sparkle spawn rate (1-100, default: 100) |
| `speed` | Gradient transition speed (0.1-5.0, default: 0.75) |
| `bloom` | Light spread radius (0=none, 100=4 LEDs, default: 90) |
| `reset` | Clear existing effects before adding |

### Test LEDs

Hardware validation pattern that cycles through colors. Used for diagnostics. Triggered via the BOOT button on the ESP32 or from the Hub application.

## Blend Modes

Effects can use different blend modes when compositing:

- **Replace**: Overwrite the pixel completely
- **Alpha**: Standard alpha compositing
- **Additive**: Add colors together (bright effects)
- **Average**: 50/50 blend

## Performance Limits

| Constraint | Limit |
|------------|-------|
| Concurrent pulses | 64 |
| Concurrent explosions | 64 |
| Concurrent wipes | 64 |
| Concurrent text | 64 |
| Concurrent bitmaps | 1024 |
| Particles | 500 |
| Bitmap memory | 128 KB |
