# FFT Audio Analysis / Spectrum Analyzer

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
| `emit_events` | `false` | Send FFT data via `_G.event()` — must be `true` to emit events |
| `on_update` | `nil` | Callback `function(bands)` called each update with normalized 0–9 values |
| `log_bars` | `false` | Print bar graph to console (debugging) |
| `fps` | `10` | Update rate |
| `devices` | all | Array of audio device patterns to monitor |
| `boot_delay` | `0` | Seconds to wait before starting |

## Events Emitted

- `rgfx/audio/fft` — Array of 5 normalized bands: `[bass, low, mid, high, treble]`

Each band is a value from 0-9, auto-adjusted based on the game's audio characteristics.

## Frequency Bands

| Band | Frequency |
|------|-----------|
| Bass | 110 Hz |
| Low | 330 Hz |
| Mid | 660 Hz |
| High | 1320 Hz |
| Treble | 2640 Hz |

## Device Filtering

By default, FFT analyzes all audio devices. To focus on specific chips:

```lua
fft.init({
    devices = { "ym2151", "ym2203" },
})
```

Device names are matched as patterns, so `"ym"` would match any Yamaha chip.

### Finding Available Devices

To see what audio devices a game uses, add this code to your interceptor:

```lua
print("Available audio devices:")
for tag, device in pairs(manager.machine.sounds) do
    print(string.format("  %s (outputs: %d)", tag, device.outputs or 0))
end
```

This prints to the MAME console when the game loads. Common device names include:

- `ym2151`, `ym2203`, `ym2612` — Yamaha FM synthesizers
- `sn76496` — TI sound chip (used in many early games)
- `namco` — Namco custom sound
- `pokey` — Atari POKEY
- `speaker` — Simple speaker/beeper output
