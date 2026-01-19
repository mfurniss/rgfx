# FFT Audio Analysis

The FFT module performs real-time frequency analysis of game audio, enabling sound-reactive lighting effects.

```lua
local fft = require("fft")
```

## Usage

```lua
fft.init({
    emit_events = true,
    log_bars = false,
    fps = 10,
    devices = { "ym2151" },
    boot_delay = 5,
})
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `emit_events` | false | Send FFT data as events |
| `log_bars` | false | Print bar graph to console (debugging) |
| `fps` | 10 | Update rate |
| `devices` | all | Array of audio device patterns to monitor |
| `boot_delay` | 0 | Seconds to wait before starting |

## Events Emitted

- `rgfx/audio/fft` — Array of 5 normalized bands: `[bass, low, mid, high, treble]`

Each band is a value from 0-9, auto-adjusted based on the game's audio characteristics.

## Frequency Bands

| Band | Frequency | Typical Content |
|------|-----------|-----------------|
| Bass | 110 Hz | Explosions, deep sounds |
| Low | 330 Hz | Music bass lines |
| Mid | 660 Hz | Melody, most sound effects |
| High | 1320 Hz | High notes, laser sounds |
| Treble | 2640 Hz | Coin sounds, high-pitched effects |

## Device Filtering

By default, FFT analyzes all audio devices. To focus on specific chips:

```lua
fft.init({
    emit_events = true,
    devices = { "ym2151", "ym2203" },
})
```

Device names are matched as patterns, so `"ym"` would match any Yamaha chip.
