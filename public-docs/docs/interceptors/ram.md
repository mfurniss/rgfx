# RAM Monitoring

The `ram` module watches memory addresses and calls your code when values change.

```lua
local ram = require("ram")
```

## Boot Delay

Most arcade games run a power-on self test before gameplay. Use `_G.boot_delay()` to suppress events until the game reaches a stable state:

```lua
_G.boot_delay(6)  -- Suppress events for 6 seconds
```

During the delay, all events are silently dropped except `/init` topics. A countdown is displayed in the MAME console. This is a global function defined by the `event` module — not part of `ram`.

## Installing Monitors

There are two ways to set up memory monitoring.

### Option 1: Monitor Map (Recommended)

Define all your monitors in a table and install them at once:

```lua
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

local map = {
    player_score = {
        addr_start = 0x4E80,
        size = 4,
        callback_changed = function(value, previous)
            _G.event("galaga/player/score/p1", value)
        end,
    },
    lives = {
        addr_start = 0x4E14,
        callback_changed = function(value, previous)
            _G.event("galaga/player/lives", value)
        end,
    },
}

ram.install_monitors(map, mem)
```

### Option 2: Individual Monitors

Install monitors one at a time for more control:

```lua
ram.install_ram_monitor({
    mem = cpu.spaces["program"],
    start_addr = 0x4E80,
    end_addr = 0x4E83,     -- Optional: monitor a range
    size = 4,              -- 1 (byte), 2 (word), or 4 (dword)
    name = "player_score", -- Optional: for debugging
    callback_changed = function(value, previous)
        _G.event("galaga/player/score/p1", value)
    end,
})
```

## Monitor Options

| Option | Required | Description |
|--------|----------|-------------|
| `addr_start` | Yes | Starting memory address |
| `addr_end` | No | Ending address (defaults to `addr_start`) |
| `size` | No | Bytes to read: 1, 2, or 4 (default: 1) |
| `callback` | No | `function(addr, current, previous)` — called for each changed address |
| `callback_changed` | No | `function(current, previous)` — simpler form for single addresses |

## Monitor Control

`install_ram_monitor` returns a handle for controlling the monitor:

```lua
local handle = ram.install_ram_monitor({ ... })

handle.disable()  -- Temporarily stop monitoring
handle.enable()   -- Resume monitoring
handle.remove()   -- Permanently remove the monitor
```
