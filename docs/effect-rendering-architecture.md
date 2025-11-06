# Effect Rendering Architecture

## Overview

This document explores the multi-canvas compositing architecture for the RGFX effect rendering system, comparing approaches for managing multiple simultaneous LED effects.

---

## Multi-Canvas Compositing Architecture

### ✅ Advantages

#### 1. Perfect Separation of Concerns
Each effect operates independently on its own canvas without needing to know about other effects:
```typescript
class PulseEffect {
  private canvas: RGBACanvas;

  render(deltaTime: float) {
    // Renders only to own canvas - no knowledge of other effects
    this.canvas.clear();
    this.drawPulse();
  }
}
```

#### 2. Proper Alpha Blending
Effects can use full alpha channel for transparency and layering:
```typescript
// Effect 1: Semi-transparent pulse
pulseCanvas.setPixel(x, y, {r: 255, g: 0, b: 0, a: 128});

// Effect 2: Sparkle overlay
sparkleCanvas.setPixel(x, y, {r: 255, g: 255, b: 255, a: 200});

// Compositor blends them properly
finalColor = alphaBlend(pulseColor, sparkleColor);
```

#### 3. Effect Priority/Layering
Natural z-ordering through render order:
```typescript
compositor.addLayer(backgroundEffect.canvas, 0);  // Bottom layer
compositor.addLayer(pulseEffect.canvas, 1);
compositor.addLayer(sparkleEffect.canvas, 2);     // Top layer
```

#### 4. Independent Effect Lifetimes
Effects can be added/removed without affecting others:
```typescript
// Add temporary effect
const flash = new FlashEffect();
compositor.addLayer(flash.canvas, 10);  // Top priority

setTimeout(() => {
  compositor.removeLayer(flash.canvas);  // Clean removal
}, 500);
```

#### 5. Easier Testing
Each effect can be tested in isolation:
```typescript
test('PulseEffect renders correctly', () => {
  const effect = new PulseEffect(64);  // 64 LEDs
  effect.render(0.016);  // One frame

  // Test only this effect's canvas
  expect(effect.canvas.getPixel(0)).toEqual({r: 255, g: 0, b: 0, a: 255});
});
```

#### 6. Performance Optimization Opportunities
- Skip compositing for inactive effects (alpha = 0 everywhere)
- Dirty rectangle tracking per effect
- Parallel rendering of independent effects

---

### ⚠️ Trade-offs & Considerations

#### 1. Memory Overhead
Each canvas needs RGBA buffer:
```
Single effect canvas: 64 LEDs × 4 bytes (RGBA) = 256 bytes
5 active effects: 1,280 bytes
10 active effects: 2,560 bytes
```

**ESP32 Impact**: Not a concern on Hub (plenty of RAM), but if effects ever move to ESP32, memory becomes critical.

#### 2. Compositing Performance
Must blend all layers every frame:
```typescript
// Per-frame cost
for (let pixel = 0; pixel < ledCount; pixel++) {
  let finalColor = {r: 0, g: 0, b: 0, a: 0};

  for (let layer of layers) {
    const effectColor = layer.canvas.getPixel(pixel);
    finalColor = alphaBlend(finalColor, effectColor);
  }

  outputBuffer[pixel] = finalColor;
}
```

**Cost**: `O(pixels × layers)` per frame

For 64 LEDs × 5 effects × 60 FPS = 19,200 blend operations/sec

**Mitigation**: Alpha blending is cheap on modern CPUs, this is negligible.

#### 3. Complexity vs. Simple Additive Blending
Current simple approach:
```cpp
// Current: Direct LED manipulation
fill_solid(matrix.leds, matrix.size, CRGB::Black);
pulseEffect.render(matrix);  // Draws directly
```

Multi-canvas approach:
```typescript
// New: Multi-stage pipeline
pulseEffect.render(pulseCanvas);
sparkleEffect.render(sparkleCanvas);
compositor.composite([pulseCanvas, sparkleCanvas], outputBuffer);
udp.send(outputBuffer);
```

**Question**: Is the added complexity worth it for your use cases?

---

## 🎯 Recommendation: Hybrid Approach

Consider a **middle ground** that gives flexibility without full multi-canvas overhead:

```typescript
class EffectRenderer {
  private effects: IEffect[] = [];
  private tempCanvas: RGBACanvas;  // Shared temp buffer
  private outputBuffer: RGBBuffer;

  render(deltaTime: number) {
    // Clear output
    this.outputBuffer.fill({r: 0, g: 0, b: 0});

    // Render each effect to temp canvas, then composite
    for (const effect of this.effects) {
      this.tempCanvas.clear();
      effect.render(this.tempCanvas, deltaTime);

      // Composite temp canvas onto output
      this.composite(this.tempCanvas, this.outputBuffer);
    }

    // Send to drivers
    this.udp.send(this.outputBuffer);
  }

  private composite(source: RGBACanvas, dest: RGBBuffer) {
    for (let i = 0; i < source.length; i++) {
      const src = source.getPixel(i);
      const dst = dest.getPixel(i);

      // Alpha blend (over operator)
      const alpha = src.a / 255.0;
      dest.setPixel(i, {
        r: src.r * alpha + dst.r * (1 - alpha),
        g: src.g * alpha + dst.g * (1 - alpha),
        b: src.b * alpha + dst.b * (1 - alpha)
      });
    }
  }
}

// Effect interface
interface IEffect {
  render(canvas: RGBACanvas, deltaTime: number): void;
  isActive(): boolean;
}
```

**Benefits**:
- ✅ Effects still independent (render to provided canvas)
- ✅ Proper alpha blending support
- ✅ Single shared temp buffer (minimal memory overhead)
- ✅ Easier to add per-effect canvases later if needed
- ✅ Simpler than full multi-canvas system

---

## 🔍 Key Questions Before Deciding

### 1. Do you need simultaneous overlapping effects?
- Example: Pulse effect while sparkles play on top?
- **If yes** → Multi-canvas shines
- **If no** → Simpler approaches work

### 2. What's your typical effect count?
- **1-2 effects**: Simple approach fine
- **3-5 effects**: Hybrid works well
- **10+ effects**: Full multi-canvas justified

### 3. Do effects need different blend modes?
- Additive blending (fire + sparkles)
- Multiplicative blending (color filters)
- Screen blending (highlights)

If yes → Multi-canvas enables this:
```typescript
compositor.composite(layer1, layer2, BlendMode.Additive);
```

### 4. Are you planning effect scripting/plugins?
If users will write custom effects, giving them an isolated canvas is **much safer** than letting them modify shared LED buffers directly.

---

## 💡 Suggested Path Forward

### Phase 1: Implement Hybrid Approach (Shared Temp Canvas)
- Validates alpha blending performance
- Enables effect isolation
- Low complexity increase

### Phase 2: Profile with Real Usage
- Monitor effect count
- Check alpha blending performance
- Identify bottlenecks

### Phase 3: Upgrade to Full Multi-Canvas If:
- You frequently run 5+ simultaneous effects
- You need per-effect dirty tracking
- You implement blend mode system
- Users are writing custom effects

---

## Architectural Alignment with Separation of Concerns

This approach addresses the **separation of concerns** evaluation findings:

### Strengths
- **Clean effect isolation**: Each effect class has single responsibility (render to canvas)
- **Compositor responsibility**: Single class handles all blending logic
- **Testability**: Effects can be unit tested without mocking the entire rendering pipeline
- **Modularity**: New effects can be added without modifying compositor

### Avoids Previous Violations
- **No god objects**: Each component has focused responsibility
- **No mixed protocol/business logic**: Effect rendering is pure business logic
- **Clear boundaries**: Canvas abstraction provides well-defined interface

### Implementation Location
- **Hub**: `rgfx-hub/src/effects/` (TypeScript)
- **Canvas abstraction**: `rgfx-hub/src/rendering/canvas.ts`
- **Compositor**: `rgfx-hub/src/rendering/compositor.ts`
- **Effect interface**: `rgfx-hub/src/effects/i-effect.ts`

---

## Related Documents
- [Architecture Overview](architecture.md)
- [Separation of Concerns Evaluation](../notes/separation-of-concerns-evaluation.md) (if created)
