# Graphics Module

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

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
| `coordinate_transforms.h/cpp` | Layout-based coordinate transformations for various matrix wiring patterns, including unified multi-panel support |
| `downsample_to_matrix.h` | Optimized downsampling from Canvas to Matrix with gamma correction |

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
- Unified multi-panel support with per-panel rotation

### Constructors

**Single panel:**
```cpp
Matrix(uint16_t width, uint16_t height, const String& layoutPattern);
```

**Unified multi-panel:**
```cpp
Matrix(uint16_t panelWidth, uint16_t panelHeight,
       uint8_t unifiedCols, uint8_t unifiedRows,
       const uint8_t* panelOrder,
       const uint8_t* panelRotation,
       const String& layoutPattern);
```

### Layout Types
- `STRIP` - 1D LED strip (height = 1)
- `MATRIX` - 2D LED matrix with various wiring patterns

### Supported Matrix Layouts
The coordinate transform system supports multiple wiring patterns:
- `matrix-tl-h-snake` - Top-left, horizontal, serpentine
- `matrix-br-v-snake` - Bottom-right, vertical, serpentine
- And other combinations of origin/direction/pattern

### Unified Panel Configuration

Multiple identical panels can be combined into a single logical display using the unified panel system:

- **panelOrder**: Array of panel chain indices in row-major grid order
- **panelRotation**: Array of rotation values per panel (0=0°, 1=90°, 2=180°, 3=270° clockwise)

**Example:** Four 8x8 panels in a 2x2 grid with mixed rotations:
```
Config: [["2b", "3b"], ["1b", "0a"]]

panelOrder = [2, 3, 1, 0]     // Grid position -> chain index
panelRotation = [1, 1, 1, 0]  // b=90°, b=90°, b=90°, a=0°
```

**Rotation handling:**
- Square panels (NxN): All rotations result in same dimensions
- Non-square panels (WxH): 90°/270° rotations swap dimensions (WxH becomes HxW)
- Each panel's rotation is applied independently when building the coordinate map
- Grid cell dimensions are determined by the first panel's rotation

## Coordinate Transforms

The `coordinate_transforms.cpp` module provides coordinate mapping from logical (x, y) positions to physical LED indices.

### Functions

**Single panel:**
```cpp
uint16_t* buildCoordinateMap(uint16_t width, uint16_t height, const char* layout);
```

**Unified multi-panel:**
```cpp
uint16_t* buildUnifiedCoordinateMap(
    uint16_t panelWidth, uint16_t panelHeight,
    uint8_t unifiedCols, uint8_t unifiedRows,
    const uint8_t* panelOrder,
    const uint8_t* panelRotation,
    const char* layout
);
```

### Rotation Math

The coordinate transform applies an **inverse rotation** to map from logical display coordinates back to physical panel coordinates. The rotation describes how the panel is physically oriented:

| Rotation | Transform | Panel Origin Position |
|----------|-----------|----------------------|
| 0° (a)   | `(x, y)` | Top-left |
| 90° (b)  | `(y, effW - 1 - x)` | Top-right |
| 180° (c) | `(effW - 1 - x, effH - 1 - y)` | Bottom-right |
| 270° (d) | `(effH - 1 - y, x)` | Bottom-left |

Where `effW` and `effH` are the effective dimensions (swapped for 90°/270° on non-square panels).

**Note:** The rotation setting describes the physical panel orientation, not a content rotation. For multi-panel displays, use consistent rotations that match your physical wiring.

## Downsample Pipeline

### downsampleToMatrix()
Downsamples a single Canvas to the physical LED Matrix with gamma correction:
```cpp
inline void downsampleToMatrix(Canvas& canvas, Matrix* matrix);
```

Features:
- Direct buffer access eliminates per-pixel bounds checking overhead
- Optimized paths for strips (4 pixels → 1 LED) vs matrices (4x4 pixels → 1 LED)
- Per-channel gamma correction via precomputed lookup tables
- Separate gamma values for R, G, B channels (configured via driver config)

### Gamma Correction
Gamma lookup tables are rebuilt when configuration changes:
```cpp
extern uint8_t g_gammaLutR[256];
extern uint8_t g_gammaLutG[256];
extern uint8_t g_gammaLutB[256];

void rebuildGammaLUT();  // Call after receiving new gamma values from Hub
```

## Dependencies

- `FastLED.h` - LED control and CRGB types
- `config/constants.h` - Default matrix dimensions
