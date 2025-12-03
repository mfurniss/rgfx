# Graphics Module

This folder contains the core graphics primitives for the ESP32 driver firmware, including canvas rendering, matrix management, coordinate transforms, and downsampling.

## Architecture

The graphics pipeline operates at 4x resolution for sub-pixel precision, then downsamples to the physical LED matrix/strip resolution. Effects render to a high-resolution Canvas (RGBA), which is then downsampled and composited to the Matrix (RGB LEDs).

```
Effects → Canvas (4x resolution, RGBA) → Downsample → Matrix (1x resolution, RGB)
```

## Files

| File | Description |
|------|-------------|
| `canvas.h/cpp` | High-resolution RGBA drawing surface with blend modes |
| `matrix.h/cpp` | Physical LED matrix abstraction with coordinate mapping |
| `coordinate_transforms.h/cpp` | Layout-based coordinate transformations for various matrix wiring patterns |
| `downsample.h/cpp` | 4x4 box filter downsampling for Canvas-to-Canvas operations |
| `downsample_to_matrix.h` | Template function to downsample and composite multiple effect canvases to Matrix |

## Canvas

The Canvas class provides a 32-bit RGBA drawing surface at 4x the matrix resolution. This enables:
- Sub-pixel precision for smooth animations
- Alpha blending for layered effects
- Anti-aliased rendering when downsampled

### Blend Modes
- `REPLACE` - Direct pixel replacement
- `ALPHA` - Standard alpha compositing
- `ADDITIVE` - Add colors together (for glows/explosions)
- `AVERAGE` - Average existing and new color

### RGBA Macros
```cpp
RGBA(r, g, b, a)      // Compose RGBA value
RGBA_RED(rgba)        // Extract red channel
RGBA_GREEN(rgba)      // Extract green channel
RGBA_BLUE(rgba)       // Extract blue channel
RGBA_ALPHA(rgba)      // Extract alpha channel
```

## Matrix

The Matrix class represents the physical LED array with:
- Logical (x, y) coordinate access via `led(x, y)` and `xy(x, y)`
- Layout-aware coordinate mapping (strips, various matrix wiring patterns)
- Direct FastLED CRGB buffer access

### Layout Types
- `STRIP` - 1D LED strip (height = 1)
- `MATRIX` - 2D LED matrix with various wiring patterns

### Supported Matrix Layouts
The coordinate transform system supports multiple wiring patterns:
- `matrix-tl-h-snake` - Top-left, horizontal, serpentine
- `matrix-br-v-snake` - Bottom-right, vertical, serpentine
- And other combinations of origin/direction/pattern

## Downsample Pipeline

### downsample()
Basic 4x4 box filter for Canvas-to-Canvas downsampling:
```cpp
void downsample(const Canvas* source, Canvas* destination);
```

### downsampleToMatrix()
Template function that composites multiple effect canvases and downsamples directly to the Matrix:
```cpp
template <size_t N>
void downsampleToMatrix(EffectProcessor::EffectEntry (&effects)[N], Matrix* matrix);
```

Features:
- Alpha-aware compositing of multiple effect layers
- Optimized paths for strips (1D) vs matrices (2D)
- Direct output to FastLED buffer

## Dependencies

- `FastLED.h` - LED control and CRGB types
- `config/constants.h` - Default matrix dimensions
