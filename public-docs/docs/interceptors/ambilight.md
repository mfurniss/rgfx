# Ambilight

The ambilight module captures colors from the edges of the game screen, enabling ambient lighting effects that react to on-screen visuals.

```lua
local ambilight = require("ambilight")
```

## Usage

```lua
ambilight.init({
    edges = { "top", "bottom", "left", "right" },
    zones_per_edge = 10,
    sample_depth = 8,
    inset = 0,
    frame_skip = 5,
    smoothing_frames = 8,
})
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `edges` | all four | Which screen edges to sample |
| `zones_per_edge` | 10 | Number of color zones per edge |
| `sample_depth` | 8 | Pixels inward from edge to sample |
| `inset` | 0 | Pixel offset from screen edge |
| `frame_skip` | 5 | Frames between samples (~10 fps at 60 fps) |
| `smoothing_frames` | 8 | Frames to average for smooth output |

## Events Emitted

- `rgfx/ambilight/top`
- `rgfx/ambilight/bottom`
- `rgfx/ambilight/left`
- `rgfx/ambilight/right`

Each event payload contains comma-separated hex colors representing the zones:

```
FF0000,00FF00,0000FF,FFFF00,FF00FF,...
```

## How It Works

The module:

1. Captures the screen framebuffer each sample interval
2. Divides each enabled edge into zones
3. Averages pixel colors within each zone
4. Applies temporal smoothing to prevent flicker
5. Emits events only when colors change

Screen resolution and pixel format are detected automatically.
