# Visual Effects

RGFX drivers support 13 visual effects that render on LED strips and matrices.

## How Effects Work

Effects are sent from the Hub to drivers as JSON commands over MQTT. The driver renders effects to an internal canvas at 4x resolution, then downsamples to the physical LED layout. Multiple effects can composite together, with the background rendering first and other effects layering on top.

## Effects Reference

### Background

Fills the entire display with a solid color or gradient. Renders first, allowing other effects to layer on top. Supports smooth cross-fading between colors.

| Parameter | Description |
|-----------|-------------|
| `gradient.colors` | Array of hex colors (2-64) |
| `gradient.orientation` | `horizontal` or `vertical` |
| `fadeDuration` | Fade transition time in ms (default: 1000) |

### Pulse

Pulsing color overlay that expands and contracts. Supports multiple simultaneous pulses.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `duration` | Duration in ms |
| `fade` | Fade out (`true`) or stay bright (`false`) |
| `easing` | Easing function (e.g., `easeInOutQuad`) |
| `collapse` | Direction: `horizontal`, `vertical`, `none`, `random` |

### Bitmap

Animated sprite display with frame-based animation, movement, and fading. Uses 16-color palettes.

| Parameter | Description |
|-----------|-------------|
| `image` | Array of pixel rows (hex chars map to palette) |
| `palette` | Array of 16 hex colors |
| `x`, `y` | Start position (or `random`) |
| `endX`, `endY` | End position for movement |
| `easing` | Movement easing function |
| `fadeInMs`, `fadeOutMs` | Fade durations |
| `duration` | Total effect duration |
| `frameRate` | Frames per second (default: 2) |

### Wipe

Directional color sweep across the display.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `duration` | Duration in ms |
| `direction` | `left`, `right`, `up`, `down`, `random` |
| `blendMode` | `additive` or `replace` |

### Explode

Radial explosion from a center point. On matrices, emits particles. On strips, creates a collapsing flash.

| Parameter | Description |
|-----------|-------------|
| `x`, `y` | Center position |
| `color` | Hex color (required) |
| `spread` | Initial radius |
| `duration` | Duration in ms |
| `hueSpread` | Color variation for rainbow effect |
| `particleCount` | Number of particles (matrices) |

### Projectile

Moving object with velocity and optional particle trail. Starts from screen edge.

| Parameter | Description |
|-----------|-------------|
| `color` | Hex color (required) |
| `direction` | `left`, `right`, `up`, `down`, `random` |
| `velocity` | Speed in pixels/second |
| `friction` | Deceleration (0=none, positive=slow, negative=accelerate) |
| `trail` | Trail length multiplier |
| `width`, `height` | Object size |
| `lifespan` | Auto-removal timeout in ms |
| `particleDensity` | Trail particle chance (0-100%) |

### Text

Static text display with optional gradient animation. Matrix only.

| Parameter | Description |
|-----------|-------------|
| `text` | Text to display (max 32 chars) |
| `color` | Hex color (required) |
| `accentColor` | Highlight color |
| `duration` | Display time in ms (0=permanent) |
| `gradient` | Array of hex colors for animation |
| `gradientSpeed` | Animation speed (default: 3.0) |
| `gradientScale` | Color offset between chars (default: 4.0) |

### Scroll Text

Horizontally scrolling text with gradient animation.

| Parameter | Description |
|-----------|-------------|
| `text` | Text to display (max 64 chars) |
| `color` | Hex color (required) |
| `speed` | Scroll speed in pixels/second |
| `repeat` | Restart when text exits (`true`/`false`) |
| `snapToLed` | Snap to LED boundaries for smoother motion |
| `gradient` | Array of hex colors for animation |

### Plasma

Classic demoscene plasma effect using Perlin noise.

| Parameter | Description |
|-----------|-------------|
| `gradient` | Array of hex colors (default: rainbow) |
| `scale` | Pattern frequency (0.1-10.0) |
| `speed` | Speed multiplier (1.0=normal) |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |
| `fadeDuration` | Fade time in ms (default: 1000) |

### Warp

Center-radiating animated gradient creating tunnel or bulge effects.

| Parameter | Description |
|-----------|-------------|
| `gradient` | Array of hex colors |
| `orientation` | `horizontal` or `vertical` |
| `speed` | Positive=expand, negative=collapse |
| `scale` | Gradient stretch factor |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |
| `fadeDuration` | Fade time in ms (default: 1000) |

### Spectrum

FFT spectrum analyzer visualization with rainbow columns and decay animation.

| Parameter | Description |
|-----------|-------------|
| `bands` | Number of frequency bands/columns |
| `decay` | Column fall rate (units per second) |

### Particle Field

Animated particle system for starfields, rain, or snow effects.

| Parameter | Description |
|-----------|-------------|
| `particleCount` | Number of particles (max 100) |
| `speed` | Base particle speed |
| `direction` | `up`, `down`, `left`, `right` |
| `color` | Hex color |
| `size` | Particle size |
| `enabled` | `on`, `off`, `fadeIn`, `fadeOut` |
| `fadeDuration` | Fade time in ms (default: 1000) |

### Test LEDs

Hardware validation pattern that cycles through colors. Used for diagnostics.

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
