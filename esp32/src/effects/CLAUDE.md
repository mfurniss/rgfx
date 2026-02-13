# Effects System

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains the visual effects system for the ESP32 driver. Effects are triggered by JSON messages from the Hub and rendered to the LED hardware.

---

## Architecture

### Effect Interface

All effects implement the `IEffect` interface defined in [effect.h](effect.h):

```cpp
class IEffect {
  virtual void add(JsonDocument& props) = 0;  // Add new instance with properties
  virtual void update(float deltaTime) = 0;   // Update animation state
  virtual void render() = 0;                  // Draw to canvas
  virtual void reset() = 0;                   // Clear all instances
};
```

### Effect Processor

[effect_processor.h](effect_processor.h) manages all effects:

- Owns a single shared `Canvas` used by all effects
- Maintains an effect map (name -> effect instance)
- Handles frame timing and delta time calculation
- Calls `update()` and `render()` on each effect every frame
- Routes incoming effect commands to the appropriate effect
- Reports effect errors to Hub via MQTT when required properties are missing

### Error Reporting

Effects call `publishError(effectName, errorMessage, props)` when required properties are missing or invalid. Errors are published to `rgfx/system/driver/error` MQTT topic with source name, message, and original props for debugging.

---

## Available Effects

| Effect | File | Description |
|--------|------|-------------|
| **Background** | [background.h](background.h)/[background.cpp](background.cpp) | Singleton solid color background. Renders first as a base layer. Supports fade states (enabled/fadeIn/fadeOut/disabled). |
| **Bitmap** | [bitmap.h](bitmap.h)/[bitmap.cpp](bitmap.cpp) | Animated sprite display with 16-color palette, movement, and fade. |
| **Explode** | [explode.h](explode.h)/[explode.cpp](explode.cpp) | Radial explosion effect from a center point. |
| **Particle Field** | [particle_field.h](particle_field.h)/[particle_field.cpp](particle_field.cpp) | Field of animated particles with configurable behavior. |
| **Sparkle** | [sparkle.h](sparkle.h)/[sparkle.cpp](sparkle.cpp) | Twinkling single-LED particles cycling through a gradient. Cloud-based spawning with FIFO particle buffer. |
| **Plasma** | [plasma.h](plasma.h)/[plasma.cpp](plasma.cpp) | Animated plasma effect using Perlin noise with gradient colors. |
| **Projectile** | [projectile.h](projectile.h)/[projectile.cpp](projectile.cpp) | Moving rectangular object with direction, velocity, friction, and optional trail. |
| **Pulse** | [pulse.h](pulse.h)/[pulse.cpp](pulse.cpp) | Pulsing color overlay with easing functions. Supports fade, collapse modes, and duration. |
| **Scroll Text** | [scroll_text.h](scroll_text.h)/[scroll_text.cpp](scroll_text.cpp) | Horizontally scrolling text with gradient color animation. Color is optional when gradient is provided. |
| **Warp** | [warp.h](warp.h)/[warp.cpp](warp.cpp) | Center-radiating animated gradient with linear perspective scale (tunnel/bulge). |
| **Spectrum** | [spectrum.h](spectrum.h)/[spectrum.cpp](spectrum.cpp) | FFT spectrum analyzer visualization. |
| **Music** | [music.h](music.h)/[music.cpp](music.cpp) | Music channel visualizer. FIFO of decaying vertical bars, one per note. Matrix-only. |
| **Text** | [text.h](text.h)/[text.cpp](text.cpp) | Static text with gradient color animation. Uses DEN 8x8 bitmap font. |
| **Test LEDs** | [test_leds.h](test_leds.h)/[test_leds.cpp](test_leds.cpp) | Hardware validation pattern. Cycles through colors to verify LED wiring. |
| **Wipe** | [wipe.h](wipe.h)/[wipe.cpp](wipe.cpp) | Directional color wipe (left, right, up, down). |

---

## Bitmap Effect Details

The bitmap effect supports animated sprites with these features:

**Image Format:**
- `image`: Array of strings, each string is a row of pixels
- Each character maps to a palette index (0-9, A-F for 16 colors)
- Spaces or dots represent transparency
- `palette`: Array of 16 hex color strings (e.g., `["#000000", "#FF0000", ...]`)
- Hub provides PICO-8 palette as default

**Animation Properties:**
- `x`, `y`: Start position (can be `"random"` for random placement)
- `endX`, `endY`: Optional end position for movement animation
- `easing`: Easing function name for movement (e.g., "easeInOutQuad")
- `fadeInMs`, `fadeOutMs`: Fade in/out duration in milliseconds
- `duration`: Total effect duration in milliseconds

**Positioning:**
- Positions are snapped to LED boundaries (4-pixel canvas intervals)
- Off-canvas bitmaps are handled gracefully (no rendering if fully outside)

---

## Gradient Color Animation

Text, Scroll Text, and Plasma effects support gradient colors:

**Gradient Properties:**
```json
{
  "gradient": ["#FF0000", "#00FF00", "#0000FF"],
  "gradientSpeed": 3.0,
  "gradientScale": 1.0
}
```

- `gradient`: Array of hex color strings (2-64 colors)
- `gradientSpeed`: Animation speed multiplier (Text/Scroll Text only)
- `gradientScale`: Color offset between adjacent characters (Text/Scroll Text only)

**Static Gradients (Background):**
- `gradient`: Array of hex color strings
- `orientation`: "horizontal" or "vertical"
- No animation - colors mapped directly to position

**Implementation:**
- 100-entry lookup table (LUT) pre-computed from gradient colors
- For animated gradients: each character offset in LUT by `gradientScale`
- Animation time advances with `gradientSpeed / 2.0` multiplier, wraps at 1000.0

---

## Effect Lifecycle

1. **Trigger:** Hub sends JSON message via UDP: `{"effect": "pulse", "props": {...}}`
2. **Route:** EffectProcessor looks up "pulse" in effect map
3. **Add:** `pulseEffect.add(props)` creates a new Pulse instance
4. **Update:** Each frame, `effect.update(deltaTime)` advances animation
5. **Render:** `effect.render()` draws to the shared Canvas
6. **Complete:** Instances remove themselves when their duration expires

---

## Files

| File | Purpose |
|------|---------|
| `effect.h` | Base `IEffect` interface |
| `effect_processor.h/cpp` | Manages effects, frame timing, and rendering |
| `effect_utils.h/cpp` | Shared utilities: color parsing, `FadeState` for fade in/out transitions |
| `gradient_utils.h/cpp` | Gradient LUT generation and color parsing |
| `text_rendering.h/cpp` | Low-level text rendering utilities (character drawing, string measurement) |
| `particle_system.h/cpp` | Shared particle system with active count tracking for early-exit optimization |
| `background.h/cpp` | Gradient background effect with fade transitions |
| `bitmap.h/cpp` | Animated sprite display with palettized memory storage |
| `explode.h/cpp` | Radial explosion effect with hueSpread color variation |
| `particle_field.h/cpp` | Particle field effect |
| `sparkle.h/cpp` | Gradient-cycling sparkle particles with bloom |
| `plasma.h/cpp` | Perlin noise plasma effect |
| `projectile.h/cpp` | Moving object with velocity capping and cross-core watchdog |
| `pulse.h/cpp` | Pulse effect with easing and collapse modes |
| `scroll_text.h/cpp` | Horizontally scrolling text with gradient (auto-centered vertically) |
| `spectrum.h/cpp` | FFT spectrum analyzer (renders behind text effects) |
| `music.h/cpp` | Music channel visualizer with FIFO note buffer (matrix-only) |
| `text.h/cpp` | Static text rendering with gradient and optional accent color |
| `test_leds.h/cpp` | Hardware test pattern |
| `warp.h/cpp` | Center-radiating animated gradient effect |
| `wipe.h/cpp` | Directional wipe effect

---

## Adding a New Effect

1. Create `myeffect.h` and `myeffect.cpp` in this folder
2. Implement the `IEffect` interface
3. Add an instance to `EffectProcessor` class
4. Add entry to `effectMap` in EffectProcessor constructor
5. Add corresponding schema in Hub's `rgfx-hub/src/schemas/effects/`
6. Use `publishError()` for missing required properties

---

## Key Concepts

- **Canvas:** 4x resolution buffer for anti-aliased rendering, downsampled to Matrix
- **Delta Time:** Frame-independent animation using elapsed time in seconds
- **Multiple Instances:** Each effect can have multiple active instances (e.g., overlapping pulses)
- **Easing Functions:** Located in `utils/easing.h`, used for smooth animation curves
- **Hub as Source of Truth:** All effect property defaults come from Hub; ESP32 expects complete props

---

## Performance Optimizations

### Effect Vector Caps

All effects with multiple instances enforce maximum vector sizes to prevent unbounded growth under high load:

| Effect | Max Instances | Notes |
|--------|---------------|-------|
| Pulse | 64 | Oldest dropped when full |
| Explode | 64 | Oldest flash dropped when full |
| Wipe | 64 | Oldest dropped when full |
| Text | 64 | Oldest dropped when full |
| Scroll Text | 64 | Oldest dropped when full |
| Projectile | 64 | Oldest dropped when full |
| Bitmap | 1024 | Higher due to existing memory budget protection |

### Particle System Active Count

The particle system tracks `activeCount` to enable early-exit optimization:
- `update()` and `render()` return immediately when no particles are active
- Eliminates unnecessary iteration over the 500-slot particle pool
- Count maintained automatically on add, death, out-of-bounds, and reset
