# Utils

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Math and animation utilities for the ESP32 driver.

## Files

### easing.h / easing_impl.cpp

Comprehensive easing function library (WTFPL license from Auerhaus Development).

**31 easing functions** in both float (`f` suffix) and double (`d` suffix) precision:

| Category | Functions |
|----------|-----------|
| Linear | `linearInterpolation` |
| Polynomial | `quadratic`, `cubic`, `quartic`, `quintic` |
| Trigonometric | `sine`, `circular` |
| Exponential | `exponential` |
| Elastic | `elastic` (damped sine wave) |
| Back | `back` (overshoots then settles) |
| Bounce | `bounce` (bouncing ball) |

Each has three variants: `EaseIn`, `EaseOut`, `EaseInOut`.

**C++ lookup utility**:
```cpp
EasingFunction getEasingFunction(const char* name);
// Names: "linear", "quadraticIn", "quadraticOut", "quadraticInOut", ...
// Default fallback: quadraticEaseOutf
```

Input: normalized progress `p` in range [0, 1]
Output: eased value in range [0, 1] (may overshoot for back/elastic)

### scale.h

D3-style scaling functions for value mapping.

```cpp
// Linear scale with clamping
auto rowScale = createLinearScale<uint32_t>(0, 1000, 0, 63);
uint32_t row = rowScale(500);  // Returns 31

// Logarithmic scale for non-linear progression
auto logScale = createLogScale<uint32_t>(1, 1000, 0, 63);
```

Template functions return lambdas for reuse. Input clamped to domain bounds.

## Usage in Effects

Easing functions drive animation timing curves. Scale functions map time/values to pixel coordinates.

```cpp
#include "utils/easing.h"
#include "utils/scale.h"

float progress = elapsed / duration;
float eased = quadraticEaseOutf(progress);
uint8_t brightness = static_cast<uint8_t>(eased * 255);
```
