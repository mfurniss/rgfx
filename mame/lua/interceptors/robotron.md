# Robotron: 2084 - Technical Notes

## Hardware

- **CPU**: Motorola MC6809E @ 1MHz
- **Endianness**: Big-endian (unlike Z80/6502)
- **Video**: 256×192 pixels, 4-bit color (16 colors)
- **Sound**: Custom Williams sound board
- **Controls**: Dual 8-way joysticks (move + fire)

## Memory Map

### RAM Layout
- `0x0000-0x8FFF`: RAM or ROM (bank-switched)
- `0x9000-0xBFFF`: RAM (always) - **Game state lives here**
- `0xC000-0xC00F`: Color palette registers
- `0xC804-0xC807`: Dual joystick input (PIA)
- `0xC900`: Bank switching control
- `0xCC00-0xCFFF`: Battery-backed NVRAM (high scores)
- `0xD000-0xFFFF`: ROM

### Key Addresses for RGFX

| Address | Size | Description |
|---------|------|-------------|
| 0xBDE4 | 4 bytes | Player 1 Score (BCD encoded) |
| 0xBDEC | 1 byte | Lives remaining |
| 0xBDED | 1 byte | Wave number |
| 0xBDE8 | 4 bytes | Next bonus life score (BCD) |
| 0x9864 | 2 bytes | Player X position (big-endian) |
| 0x9866 | 2 bytes | Player Y position (big-endian) |
| 0x9887 | 1 byte | Lasers fired count |
| 0x9888 | 1 byte | Laser H direction (0xFF=left, 0x01=right) |
| 0x9889 | 1 byte | Laser V direction (0xFF=up, 0x01=down) |
| 0x98ED | 1 byte | Enforcers on-screen |
| 0x988A | 1 byte | Sparks (enforcer missiles) |
| 0x988E | 1 byte | Cruise missiles |
| 0x9892 | 1 byte | Electrodes |

### Entity Tables
- `0x9817`: Spheroid/Enforcer list pointer
- `0x9821`: Grunts/Hulks/Brains/Progs list pointer
- `0x9823`: Electrode list pointer
- `0x9849`: Family member quick lookup pointer

## Score Encoding

Scores use Binary Coded Decimal (BCD) - 2 digits per byte:

```lua
local function decode_bcd_score(start_addr)
    local score = 0
    for i = 0, 3 do
        local byte = mem:read_u8(start_addr + i)
        local hi = (byte >> 4) & 0x0F  -- Upper digit
        local lo = byte & 0x0F         -- Lower digit
        score = score * 100 + hi * 10 + lo
    end
    return score
end
```

## Fire Direction

The game stores fire direction in two bytes:
- Horizontal: `0x9888` - `0xFF`=left, `0x01`=right, `0x00`=none
- Vertical: `0x9889` - `0xFF`=up, `0x01`=down, `0x00`=none

Combining these gives 8-way direction (up, down, left, right, up-left, up-right, down-left, down-right).

## Sources

- [Sean Riddle's Robotron Disassembly](http://www.seanriddle.com/robomame.asm) - Complete 6809 source
- [Sean Riddle's Williams Hardware](https://seanriddle.com/willhard.html)
- [Chris Lomont's Robotron Page](http://lomont.org/software/misc/robotron/)
- [MAME williams.cpp Driver](https://github.com/mamedev/mame/blob/master/src/mame/midway/williams.cpp)
- [Motorola 6809 Programming Manual](https://archive.org/details/mc6809mc6809e8bitmicroprocessorprogrammingmanualmotorolainc.1981)
- [Robotron 2084 Guidebook](http://www.robotron2084guidebook.com/technical/)

## MAME Debugging

```bash
# Launch with debugger
mame robotron -debug

# Useful watchpoints
wp 0xBDEC,1,w       # Watch lives
wp 0xBDE4,4,w       # Watch score
wp 0x9887,1,w       # Watch laser fire count

# Cheat search
cheatinit ub        # Initialize unsigned byte search
cheatnext -,1       # Find decremented values
```

## Notes

- Boot delay: ~11 seconds to skip diagnostics
- Wave counter wraps at 256 (8-bit limit)
- Object-oriented design in 6809 assembly with malloc/free
- ~120 entities on screen at wave 10
