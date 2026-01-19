# Writing Interceptors

This guide walks through creating a custom interceptor for a new game.

## Step 1: Find Memory Addresses

Use MAME's built-in debugger to discover where the game stores its state.

1. Launch MAME with debugging enabled:
   ```bash
   mame mygame -debug
   ```

2. Use watchpoints to find addresses:
   - Set a watchpoint on a memory range: `wpset 0x4000,0x1000,w`
   - Play the game and trigger the event you want to track
   - Check which addresses changed

3. Note the data format (BCD, binary, etc.) by examining values before and after changes.

## Step 2: Create the Interceptor File

Create a new file in `~/.rgfx/interceptors/games/`:

```lua
-- mygame_rgfx.lua

local ram = require("ram")

-- Skip the title screen and attract mode
ram.set_boot_delay(8)

-- Get access to the CPU's memory
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Define what to monitor
local map = {
    score = {
        addr_start = 0x1234,
        size = 2,
        callback_changed = function(value, previous)
            event("mygame/player/score", value)
        end,
    },
    lives = {
        addr_start = 0x1240,
        callback_changed = function(value, previous)
            if value < previous then
                event("mygame/player/died")
            end
            event("mygame/player/lives", value)
        end,
    },
}

-- Start monitoring
ram.install_monitors(map, mem)
```

## Step 3: Register in the ROM Map

Edit `~/.rgfx/interceptors/rom_map.lua` to add your game:

```lua
return {
    -- Existing entries...
    pacman = "pacman_rgfx",

    -- Your new game
    mygame = "mygame_rgfx",
    mygame_v2 = "mygame_rgfx",  -- Alternate ROM version
}
```

## Step 4: Test Your Interceptor

1. Start MAME with RGFX enabled
2. Load your game
3. Watch the MAME console for your event output
4. Check `~/.rgfx/interceptor_events.log` to verify events are being written

---

## Common Patterns

### Decoding BCD Scores

Many arcade games store scores in Binary Coded Decimal format:

```lua
local function decode_bcd(dword)
    local result = 0
    for i = 3, 0, -1 do
        local byte = (dword >> (i * 8)) & 0xFF
        local hi = (byte >> 4) & 0x0F
        local lo = byte & 0x0F
        result = result * 100 + hi * 10 + lo
    end
    return result
end
```

### Detecting Events from Score Deltas

Infer events from how the score changes:

```lua
local SCORE_EVENTS = {
    [10] = "small",
    [50] = "medium",
    [200] = "large",
}

local last_score = 0

callback_changed = function(value, previous)
    local score = decode_bcd(value)
    local delta = score - last_score

    local event_name = SCORE_EVENTS[delta]
    if event_name then
        event("mygame/scored", event_name)
    end

    last_score = score
end
```

### Tracking State Transitions

Watch for specific value changes:

```lua
callback_changed = function(current, previous)
    if previous == 0x00 and current == 0x01 then
        event("game/level/started")
    elseif previous == 0x01 and current == 0x00 then
        event("game/level/ended")
    end
end
```

### Counter Increment Detection

Useful for enemy kills, items collected, etc.:

```lua
callback_changed = function(current, previous)
    if current > previous then
        local count = current - previous
        event("game/enemy/destroyed", count)
    end
end
```
