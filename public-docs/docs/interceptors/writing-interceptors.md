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

!!! tip "Shortcut: MAME Cheat Files"
    Before firing up the debugger, check [MAME Cheat Downloads](https://www.mamecheat.co.uk/mame_downloads.htm) for existing cheat files. These contain known memory addresses for thousands of games (lives, scores, timers, etc.) and can save significant reverse-engineering effort. Even if a cheat file doesn't cover exactly what you need, it's a great starting point for finding nearby addresses.

## Step 2: Create the Interceptor File

Create a new file in the `interceptors/games/` folder of your [config directory](../getting-started/hub-setup.md#config-directory):

```lua
-- mygame_rgfx.lua

local ram = require("ram")

-- Skip the title screen and attract mode
_G.boot_delay(8)

-- Get access to the CPU's memory
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Define what to monitor
local map = {
    score = {
        addr_start = 0x1234,
        size = 2,
        callback_changed = function(value, previous)
            _G.event("mygame/player/score", value)
        end,
    },
    lives = {
        addr_start = 0x1240,
        callback_changed = function(value, previous)
            if value < previous then
                _G.event("mygame/player/died")
            end
            _G.event("mygame/player/lives", value)
        end,
    },
}

-- Start monitoring
ram.install_monitors(map, mem)
```

## Step 3: Register in the ROM Map

Edit `interceptors/rom_map.lua` in your config directory to add your game:

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
4. Check `interceptor-events.log` in your config directory to verify events are being written

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
        _G.event("mygame/scored", event_name)
    end

    last_score = score
end
```

### Tracking State Transitions

Watch for specific value changes:

```lua
callback_changed = function(current, previous)
    if previous == 0x00 and current == 0x01 then
        _G.event("game/level/started")
    elseif previous == 0x01 and current == 0x00 then
        _G.event("game/level/ended")
    end
end
```

### Counter Increment Detection

Useful for enemy kills, items collected, etc.:

```lua
callback_changed = function(current, previous)
    if current > previous then
        local count = current - previous
        _G.event("game/enemy/destroyed", count)
    end
end
```

### Sound Effect Monitors

Some game events are difficult to detect through memory alone — there may not be a dedicated counter or flag, or the RAM values may be ambiguous. Many arcade machines write a sound identifier or data pointer to a known address when triggering a sound effect. Polling that address each frame lets you detect specific sounds and emit events for them.

#### Finding Sound Addresses

Use the MAME debugger to locate where the game writes sound data:

1. Identify the sound hardware from the game's machine config (sound CPU, PIA registers, etc.)
2. Set write watchpoints on the sound I/O region or the RAM variables that feed it
3. Play the game and trigger distinct sounds — note which addresses change and what values are written
4. Map the observed values to gameplay events

!!! note
    MAME's `install_write_tap` only works on RAM regions, not device-mapped I/O. If the sound trigger address is memory-mapped I/O, use frame polling instead.

#### Frame Polling Pattern

Register a callback with `emu.register_frame_done` to read the sound address each frame and compare it to the previous value. The Robotron interceptor uses this approach to monitor the sound data pointer at `$9854-$9855`:

```lua
-- Lookup table mapping sound data pointers to event names
local sound_lut = {
    [0x26EE] = "laser",
    [0x26D7] = "player-death",
    [0x26E9] = "next-wave",
    [0x3896] = "explosion",
    [0x0024] = "rescue-human",
    [0xD0C7] = "extra-life",
    -- ...
}

local last_sound_ptr = 0

emu.register_frame_done(function()
    local ptr_hi = mem:read_u8(0x9854)
    local ptr_lo = mem:read_u8(0x9855)
    local ptr = (ptr_hi << 8) | ptr_lo

    if ptr ~= last_sound_ptr and ptr > 0 then
        -- Sound data advances by 3 bytes per frame during playback.
        -- A genuine new sound starts when the pointer jumps elsewhere.
        local is_new_sound = (ptr ~= last_sound_ptr + 3)

        if is_new_sound then
            local name = sound_lut[ptr]
            if name then
                _G.event("robotron/sfx/" .. name)
            end
        end
        last_sound_ptr = ptr
    end
end, "sound_monitor")
```

Key points from this example:

- **Lookup table** — map raw pointer values to human-readable event names. Log unknown values during development so you can identify and add them later.
- **Advance filtering** — the sound pointer increments by 3 each frame during playback. Only emit an event when the pointer jumps to a new location, not when it steps through existing sound data.
- **Complements RAM monitors** — sound polling runs alongside `ram.install_monitors`. Use whichever detection method is most reliable for each event.

---

**Next:** [Writing Transformers](../transformers/writing-transformers.md) — map your interceptor's events to LED effects
