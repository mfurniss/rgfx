# Galaga Memory Map

**Game:** Galaga (Namco, 1981)
**CPU:** Zilog Z80 (3 CPUs: maincpu, sub, sub2)
**Analysis Date:** 2025-01-29
**MAME Version:** 0.281

## Memory Layout

- **0x8000-0x87FF**: Video RAM (2KB)
- **0x8800-0x8BFF**: RAM Bank 0 (sprite codes, object states)
- **0x9000-0x93FF**: RAM Bank 1 (task queues, sprite positions)
- **0x9800-0x9BFF**: RAM Bank 2 (player state, config, sound registers)

## Player Ship Position

**Address:** `0x9362` (gameplay buffer)
**Type:** Single byte (unsigned)
**Range:**
- **Left edge:** 0x11 (17 decimal)
- **Right edge:** 0xE1 (225 decimal)
- **Movement range:** 210 pixels (0xE1 - 0x11)
**Update:** Every frame when ship moves

**Notes:**
- Galaga uses double-buffering for sprites
- Gameplay code writes to buffer at 0x9300-0x937F
- Hardware copies to display registers at 0x9380-0x93FF
- This is why monitoring sprite hardware registers (0x9380+) doesn't work during gameplay

**Discovery method:** Runtime memory analysis with hold-left test (address decreased consistently)

## Player Score

**Address:** `0x83F8 - 0x83FD` (video RAM, 6 bytes)
**Type:** BCD digits (0-9 in each byte, 36 = blank)
**Format:** Ascending addresses (0x83F8 = ones place, 0x83FD = hundred thousands)

**Reading score:**
```lua
local function get_galaga_score(start_addr)
    local score = 0
    for i = 5, 0, -1 do
        local digit = mem:read_u8(start_addr + i)
        if digit >= 0 and digit <= 9 then
            score = score * 10 + digit
        elseif digit == 36 and score > 0 then
            score = score * 10  -- blank in middle of number
        end
    end
    return score
end
```

## Player Missile Fire

**Address:** `0x9846` (2-byte word, little-endian)
**Variable:** `ds_plyr_actv._w_shot_ct` (player shot counter)
**Type:** 16-bit unsigned integer
**Behavior:** Increments by 1 each time player fires
**Read as:** Word (2 bytes)

**Code location:** gg1-2_fx.s, lines 2018-2020:
```z80
ld   hl,(ds_plyr_actv +_w_shot_ct)  ; Load current counter (0x9846)
inc  hl                              ; Increment by 1
ld   (ds_plyr_actv +_w_shot_ct),hl  ; Store back
```

**Alternative (NOT recommended):**
Address `0x9AAF` (shot sound flag) - set to 1 when firing, cleared immediately by sound handler (too transient)

**Discovery method:** ROM disassembly, traced from fire button input handler to counter increment

## Enemy Destroyed Counter

**Address:** `0x9844`
**Type:** Single byte
**Behavior:** Increments when enemy is destroyed

## Shot Availability Counter

**Address:** `0x920B`
**Type:** Single byte
**Behavior:** Decrements when player fires (3→2→1)

**Status:** NOT RELIABLE for fire detection (use 0x9846 instead)

## Player State Structure

**Base:** `ds_plyr_actv` at 0x9820

| Offset | Size | Variable | Description |
|--------|------|----------|-------------|
| 0x00 | 1 byte | ships | Number of ships remaining |
| 0x01 | 1 byte | stage | Stage counter |
| 0x24 | 2 bytes | hit_count | Total hits |
| **0x26** | **2 bytes** | **shot_count** | **Fire counter (0x9846)** |
| 0x28 | 1 byte | sound_flag | Sound effect flag |

## Sources

- hackbar/galaga GitHub repository (complete Z80 disassembly)
- Computer Archeology Galaga documentation
- Runtime memory analysis (MAME 0.281)
- ROM disassembly analysis: galaga.zip
