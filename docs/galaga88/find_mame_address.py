#!/usr/bin/env python3
"""
Find MAME memory address from save state offset.
For Namco System 1 (Galaga 88).

Namco System 1 memory map:
- 0x000000-0x03ffff: Banked program ROM
- 0x2e0000-0x2e7fff: Palette RAM (32KB)
- 0x2f0000-0x2f7fff: Tilemap RAM (32KB)
- 0x2f8000-0x2f9fff: Key chip (8KB)
- 0x2fc000-0x2fc7ff: Scratchpad RAM (2KB)
- 0x2fc800-0x2fcfff: Sprite registers (2KB)
- 0x2fd000-0x2fd01f: Tilemap control (32B)
- 0x2fe000-0x2fe3ff: Sound RAM (1KB)
- 0x2ff000-0x2ff7ff: TRIRAM shared (2KB)
- 0x300000-0x307fff: Work RAM (32KB)

Save state offset 0x02e756 is in the ~190KB range.
This likely corresponds to somewhere in the 0x2xxxxx or 0x3xxxxx range.
"""

import sys
import zlib

def main():
    # Known values
    save_state_offset = 0x02e756  # Where score is in save state

    # Namco System 1 memory regions (from MAME source)
    regions = [
        (0x2e0000, 0x2e7fff, "Palette RAM"),
        (0x2f0000, 0x2f7fff, "Tilemap RAM"),
        (0x2f8000, 0x2f9fff, "Key chip"),
        (0x2fc000, 0x2fc7ff, "Scratchpad RAM"),
        (0x2fc800, 0x2fcfff, "Sprite registers"),
        (0x2fd000, 0x2fd01f, "Tilemap control"),
        (0x2fe000, 0x2fe3ff, "Sound RAM"),
        (0x2ff000, 0x2ff7ff, "TRIRAM"),
        (0x300000, 0x307fff, "Work RAM"),
    ]

    # Calculate total sizes
    print("Namco System 1 Memory Regions:")
    total = 0
    for start, end, name in regions:
        size = end - start + 1
        print(f"  {name}: 0x{start:06x}-0x{end:06x} ({size} bytes, cumulative: {total})")
        total += size

    print(f"\nTotal RAM: {total} bytes (0x{total:x})")
    print(f"Save state offset: 0x{save_state_offset:06x} ({save_state_offset} bytes)")

    # The save state likely stores regions in order
    # Let's calculate which region offset 0x02e756 falls into

    # If save state starts with these regions in order:
    cumulative = 0
    for start, end, name in regions:
        size = end - start + 1
        if cumulative <= save_state_offset < cumulative + size:
            offset_in_region = save_state_offset - cumulative
            game_addr = start + offset_in_region
            print(f"\n*** Score likely in: {name}")
            print(f"    Offset within region: 0x{offset_in_region:04x}")
            print(f"    MAME address: 0x{game_addr:06x}")
            break
        cumulative += size
    else:
        print(f"\nOffset 0x{save_state_offset:06x} not in known RAM regions")
        print(f"(Cumulative RAM size: {cumulative})")

        # Maybe save state has ROM first?
        # Estimate: if there's ~128KB of ROM before RAM
        rom_size_guess = 0x20000  # 128KB
        adjusted = save_state_offset - rom_size_guess
        print(f"\nIf {rom_size_guess} bytes of ROM precede RAM:")
        print(f"  Adjusted offset: 0x{adjusted:06x}")

        cumulative = 0
        for start, end, name in regions:
            size = end - start + 1
            if cumulative <= adjusted < cumulative + size:
                offset_in_region = adjusted - cumulative
                game_addr = start + offset_in_region
                print(f"  *** Score likely in: {name}")
                print(f"      Offset within region: 0x{offset_in_region:04x}")
                print(f"      MAME address: 0x{game_addr:06x}")
                break
            cumulative += size

if __name__ == "__main__":
    main()
