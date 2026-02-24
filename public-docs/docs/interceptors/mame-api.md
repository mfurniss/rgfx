# MAME Lua API

Interceptors have access to MAME's Lua environment. This page covers the most useful objects and functions.

For complete documentation, see the [official MAME Lua Scripting Interface](https://docs.mamedev.org/luascript/index.html).

## CPU and Memory

```lua
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Read memory directly
local byte_val = mem:read_u8(0x1234)   -- Read byte
local word_val = mem:read_u16(0x1234)  -- Read word (2 bytes)
local dword_val = mem:read_u32(0x1234) -- Read dword (4 bytes)
```

## Input Ports

```lua
local ports = manager.machine.ioport.ports
local p1_input = ports[":IN0"]:read()
```

## Video

```lua
local video = manager.machine.video
local width, height = video:snapshot_size()
local pixels = video:snapshot_pixels()  -- BGRA format
```

## Audio

```lua
local sounds = manager.machine.sounds
for tag, device in pairs(sounds) do
    print(tag, device.outputs)
end
```

## Emulator Callbacks

```lua
emu.register_prestart(function()
    -- Called when the machine is about to start
end)

emu.register_frame_done(function()
    -- Called after each frame is rendered
end, "optional_name")  -- Optional name for debugging

emu.add_machine_frame_notifier(function()
    -- Called at each machine frame (alternative to register_frame_done)
end)

emu.register_sound_update(function(samples)
    -- Called when audio buffer is available
end)
```

## ROM Information

```lua
local rom_name = emu.romname()  -- e.g., "pacman"
```

---

## Troubleshooting

**Events not appearing:**

- Check the MAME console for error messages
- Verify the topic format is valid (lowercase, proper separators)
- Confirm the boot delay has expired

**Wrong values being read:**

- Double-check the memory address in MAME's debugger
- Verify the size parameter matches how the game stores the value
- Check if the value uses BCD or another encoding

**Monitor not triggering:**

- Ensure you're accessing the correct memory space (`"program"` for most games)
- Verify the address is in RAM, not ROM
- Some games use memory-mapped I/O which may require different access methods

**Interceptor not loading:**

- Check that `rom_map.lua` has an entry for your ROM name
- Verify the interceptor filename matches the map entry (without `.lua` extension)
- Look for Lua syntax errors in the MAME console
