# Galaga 88 Score Address Research

## SOLUTION FOUND

**Score Address: 0x300a16 in C117's program space**

The score is stored in Work RAM at virtual address 0x300a16. The key insight is that you must read from the **C117 memory controller's program space**, not the maincpu's program space (which goes through bank switching).

### Lua Code
```lua
local c117 = manager.machine.devices[":c117"]
local c117_mem = c117.spaces["program"]

local function read_score()
    local b0 = c117_mem:read_u8(0x300a16)     -- thousands
    local b1 = c117_mem:read_u8(0x300a16 + 1) -- hundreds
    local b2 = c117_mem:read_u8(0x300a16 + 2) -- tens
    local b3 = c117_mem:read_u8(0x300a16 + 3) -- ones
    return b0 * 1000 + b1 * 100 + b2 * 10 + b3
end
```

### Score Format
Unpacked BCD: `[thousands][hundreds][tens][ones]`
- Score 0 = `00 00 00 00`
- Score 660 = `00 06 06 00`
- Score 1180 = `01 01 08 00`

---

## Technique That Found The Score

### Step 1: Save State Analysis
Created three save states with known scores (0, 660, 1180). Used Python to decompress the save states (zlib after 32-byte header) and search for the expected byte patterns.

Found score at offset **0x02e756** in decompressed save state data.

### Step 2: MAME Source Code Analysis
Studied the MAME source code at `~/mame-source-code` to understand:

1. **Save state entry format** (`src/emu/save.cpp`):
   - Entries sorted alphabetically by name
   - Entry name format: `memory/[device_tag]/[spacenum]/[name]`
   - For anonymous RAM: `memory/:c117/0/300000-307fff`

2. **Anonymous RAM naming** (`src/emu/emumem.cpp:373-377`):
   ```cpp
   std::string name = util::string_format("%s%x-%x", key, start, end);
   return allocate_memory(space.device(), space.spacenum(), name, width, bytes);
   ```

3. **Namco System 1 memory map** (`src/mame/namco/namcos1.cpp:415`):
   ```cpp
   map(0x300000, 0x307fff).ram();  // 32KB Work RAM (anonymous)
   ```

### Step 3: Understanding the C117 MMU
The critical discovery was that the **C117 is a bank-switching MMU** (`src/mame/namco/c117.cpp`):

- The maincpu's entire address space (0x0000-0xFFFF) goes through `m_c117->main_r/main_w`
- The C117 provides a 23-bit virtual address space
- The CPU's 16-bit address is divided into 8 banks of 8KB each
- Each bank can be mapped to any 8KB region in the virtual space
- **Reading from maincpu's program space applies bank translation!**

```cpp
// From c117.h line 40:
offs_t remap(int whichcpu, offs_t offset) {
    return m_offsets[whichcpu][offset>>13] | (offset & 0x1fff);
}
```

### Step 4: The Fix
Instead of reading from `:maincpu` program space (which applies bank switching), read directly from `:c117` program space (the raw virtual address space):

**Wrong:**
```lua
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]
mem:read_u8(0x300a16)  -- Goes through bank switching, wrong result!
```

**Correct:**
```lua
local c117 = manager.machine.devices[":c117"]
local c117_mem = c117.spaces["program"]
c117_mem:read_u8(0x300a16)  -- Direct virtual address access
```

---

## Hardware: Namco System 1

### CPUs
- 3x Motorola 6809 @ 1.536 MHz (main, sub, sound)
- Hitachi HD63701 MCU @ 1.536 MHz

### Memory Banking (C117)
- CUS117 chip provides 23-bit virtual address space
- Each CPU sees 64KB divided into 8x 8KB banks
- Bank switching via writes to 0xE000-0xFFFF
- Default bank 0 maps to 0x300000 (Work RAM)

## Key Memory Regions (C117 Virtual Addresses)

From MAME `src/mame/namco/namcos1.cpp`:

| Address Range | Size | Purpose | Device/Share Name |
|---------------|------|---------|-------------------|
| 0x2e0000-0x2e7fff | 32KB | Palette RAM | c116 |
| 0x2f0000-0x2f7fff | 32KB | Tilemap/Video RAM | c123tmap videoram8 |
| 0x2f8000-0x2f9fff | 8KB | Key chip | no_key |
| 0x2fc000-0x2fc7ff | 2KB | Scratchpad RAM | scratchpad |
| 0x2fc800-0x2fcfff | 2KB | Sprite RAM | spriteram |
| 0x2fd000-0x2fd01f | 32B | Tilemap control | c123tmap control |
| 0x2fe000-0x2fe3ff | 1KB | Sound RAM (CUS30 PSG) | namco |
| 0x2ff000-0x2ff7ff | 2KB | TRIRAM (shared CPU) | triram |
| **0x300000-0x307fff** | **32KB** | **Work RAM** | (anonymous) |

## Save State Analysis

### Known Score Values
| State | Score | Bytes at 0x02e756 |
|-------|-------|-------------------|
| 1 | 0 | `00 00 00 00` |
| 2 | 660 | `00 06 06 00` |
| 3 | 1180 | `01 01 08 00` |

Save states located at: `/opt/homebrew/bin/sta/galaga88/`

### Save State Entry for Work RAM
- Entry 281 in sorted entry list
- Device: `:c117`
- Name: `0/300000-307fff`
- Size: 32,768 bytes

Score offset within Entry 281: 0x0a16
MAME virtual address: 0x300000 + 0x0a16 = **0x300a16**
