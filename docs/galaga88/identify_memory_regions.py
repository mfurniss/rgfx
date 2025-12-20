#!/usr/bin/env python3
"""
Identify which MAME memory region contains the Galaga 88 score.

Known MAME memory regions for Namco System 1:
- Palette RAM (c116): 0x2e0000-0x2e7fff (32KB)
- Tilemap RAM (c123tmap): 0x2f0000-0x2f7fff (32KB)
- Key chip: 0x2f8000-0x2f9fff (8KB)
- Scratchpad: 0x2fc000-0x2fc7ff (2KB)
- Sprite RAM: 0x2fc800-0x2fcfff (2KB)
- Tilemap control: 0x2fd000-0x2fd01f (32B)
- Sound RAM (namco): 0x2fe000-0x2fe3ff (1KB)
- TRIRAM: 0x2ff000-0x2ff7ff (2KB)
- Work RAM (mainram): 0x300000-0x307fff (32KB)

Save state likely includes:
- CPU state for all 4 CPUs
- All RAM regions above
- Device internal state
"""

import zlib
import sys

def main():
    states = {}
    scores = {1: 0, 2: 660, 3: 1180}

    for i in [1, 2, 3]:
        path = f'/opt/homebrew/bin/sta/galaga88/{i}.sta'
        with open(path, 'rb') as f:
            data = f.read()
        zlib_start = data.find(b'\x78\x9c')
        states[i] = zlib.decompress(data[zlib_start:])

    s2 = states[2]
    score_offset = 0x02e756

    print("=== Memory Region Size Analysis ===\n")

    # MAME saves memory_share objects alphabetically by their tag name
    # Let's figure out what order they'd be in

    # From namcos1.cpp, the memory shares are:
    # - c116 (palette device has internal RAM)
    # - c123tmap (tilemap device has internal videoram)
    # - mainram (work RAM)
    # - namco (sound device)
    # - scratchpad
    # - spriteram
    # - triram

    # But some of these are device-internal, not standalone shares

    regions = [
        ("c116/palette", 0x8000),      # Palette is 32KB
        ("c123tmap/videoram", 0x8000), # Tilemap is 32KB
        ("mainram", 0x8000),           # Work RAM is 32KB
        ("scratchpad", 0x800),         # 2KB
        ("spriteram", 0x800),          # 2KB
        ("triram", 0x800),             # 2KB
        ("namco", 0x400),              # Sound 1KB
    ]

    print("If memory shares are saved alphabetically:\n")

    # Alphabetical order: c116, c123tmap, mainram, namco, scratchpad, spriteram, triram
    alpha_order = [
        ("c116/palette", 0x8000),
        ("c123tmap/videoram", 0x8000),
        ("mainram", 0x8000),
        ("namco", 0x400),
        ("scratchpad", 0x800),
        ("spriteram", 0x800),
        ("triram", 0x800),
    ]

    cumulative = 0
    for name, size in alpha_order:
        end = cumulative + size
        print(f"  {name:25s}: state offset 0x{cumulative:06x}-0x{end-1:06x} ({size:5d} bytes)")
        if cumulative <= score_offset < end:
            offset_in_region = score_offset - cumulative
            print(f"    *** Score at offset 0x{offset_in_region:04x} in {name}")
        cumulative = end

    print(f"\nTotal RAM (alpha order): {cumulative:,} bytes (0x{cumulative:06x})")
    print(f"Score offset: 0x{score_offset:06x}")

    if score_offset > cumulative:
        print(f"\nScore is BEYOND simple RAM regions by {score_offset - cumulative:,} bytes")
        print("This means there's other data before the RAM regions in the save state")

    # The actual save state has CPU state, device state, etc. before RAM
    # Let's look at what the first ~64KB contains

    print("\n\n=== Analyzing First 64KB of Save State ===")
    print("Looking for recognizable patterns...\n")

    # Check for patterns that might indicate region boundaries
    # Look at 256-byte chunks
    for i in range(0, min(0x10000, len(s2)), 0x1000):
        chunk = s2[i:i+256]
        non_zeros = sum(1 for b in chunk if b != 0)
        if non_zeros > 16:
            # Show first 32 bytes
            hex_str = ' '.join(f'{b:02x}' for b in chunk[:32])
            print(f"0x{i:05x}: {hex_str}")

    print("\n\n=== Trying Different Base Offsets ===")

    # The score is at 0x02e756. If we assume various amounts of
    # "prefix" data before RAM, what MAME address would we get?

    # Work backwards from possible MAME addresses
    possible_addresses = [
        (0x2ff116, "TRIRAM offset 0x116"),
        (0x2ff756, "TRIRAM offset 0x756 (>2KB, invalid)"),
        (0x300756, "Work RAM offset 0x756"),
        (0x306756, "Work RAM offset 0x6756"),
        (0x2f6756, "Tilemap RAM offset 0x6756"),
        (0x2f7756, "Tilemap RAM offset 0x7756 (>32KB, invalid)"),
    ]

    print("If score at 0x02e756 maps to various MAME addresses:")
    for mame_addr, desc in possible_addresses:
        # What would be the prefix size?
        if "invalid" in desc:
            continue

        # Determine which region
        if 0x2f0000 <= mame_addr < 0x2f8000:
            region_base = 0x2f0000
            region_name = "Tilemap RAM"
            offset_in_region = mame_addr - region_base
        elif 0x2ff000 <= mame_addr < 0x300000:
            region_base = 0x2ff000
            region_name = "TRIRAM"
            offset_in_region = mame_addr - region_base
        elif 0x300000 <= mame_addr < 0x308000:
            region_base = 0x300000
            region_name = "Work RAM"
            offset_in_region = mame_addr - region_base
        else:
            continue

        print(f"\n  {desc}:")
        print(f"    MAME address: 0x{mame_addr:06x}")
        print(f"    Region: {region_name} (base 0x{region_base:06x})")
        print(f"    Offset in region: 0x{offset_in_region:04x}")

    # The most likely candidates:
    # - Work RAM: score often stored in work RAM as game variables
    # - TRIRAM: shared between CPUs, used for inter-CPU communication

    print("\n\n=== Testing Hypotheses in Lua ===")
    print("Try these addresses in the Lua interceptor:")
    print("  0x2ff116 (TRIRAM)")
    print("  0x300756 (Work RAM)")
    print("  0x306756 (Work RAM)")
    print("  0x2f6756 (Tilemap RAM)")


if __name__ == "__main__":
    main()
