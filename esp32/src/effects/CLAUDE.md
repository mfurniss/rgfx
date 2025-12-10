# Effects System

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
- Maintains an effect map (name → effect instance)
- Handles frame timing and delta time calculation
- Calls `update()` and `render()` on each effect every frame
- Routes incoming effect commands to the appropriate effect

---

## Available Effects

| Effect | File | Description |
|--------|------|-------------|
| **Pulse** | [pulse.h](pulse.h)/[pulse.cpp](pulse.cpp) | Pulsing color overlay with easing functions. Supports fade, collapse (shrink horizontally/vertically), and duration. |
| **Wipe** | [wipe.h](wipe.h)/[wipe.cpp](wipe.cpp) | Directional color wipe (left, right, up, down). Fills canvas with color sweeping from one edge. |
| **Explode** | [explode.h](explode.h)/[explode.cpp](explode.cpp) | Radial explosion effect from a center point. |
| **Bitmap** | [bitmap.h](bitmap.h)/[bitmap.cpp](bitmap.cpp) | Static image display. Used for sprites or icons. |
| **Test LEDs** | [test_leds.h](test_leds.h)/[test_leds.cpp](test_leds.cpp) | Hardware validation pattern. Cycles through colors to verify LED wiring. |

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
| `effect_utils.h/cpp` | Shared utility functions for effects |
| `pulse.h/cpp` | Pulse effect with easing and collapse modes |
| `wipe.h/cpp` | Directional wipe effect |
| `explode.h/cpp` | Radial explosion effect |
| `bitmap.h/cpp` | Static image display |
| `test_leds.h/cpp` | Hardware test pattern |

---

## Adding a New Effect

1. Create `myeffect.h` and `myeffect.cpp` in this folder
2. Implement the `IEffect` interface
3. Add an instance to `EffectProcessor` class
4. Add entry to `effectMap` in EffectProcessor constructor
5. Add corresponding schema in Hub's `rgfx-hub/src/schemas/effects/`

---

## Key Concepts

- **Canvas:** 4x resolution buffer for anti-aliased rendering, downsampled to Matrix
- **Delta Time:** Frame-independent animation using elapsed time in seconds
- **Multiple Instances:** Each effect can have multiple active instances (e.g., overlapping pulses)
- **Easing Functions:** Located in `utils/easing.h`, used for smooth animation curves
