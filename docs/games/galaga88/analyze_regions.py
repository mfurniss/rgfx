#!/usr/bin/env python3
"""
Analyze Galaga 88 save state to find memory region boundaries.
Score is known to be at offset 0x02e756 in decompressed save state.
"""

import zlib
import sys

def main():
    save_state_path = sys.argv[1] if len(sys.argv) > 1 else '/opt/homebrew/bin/sta/galaga88/2.sta'

    # Load and decompress save state
    with open(save_state_path, 'rb') as f:
        data = f.read()

    zlib_start = data.find(b'\x78\x9c')
    state = zlib.decompress(data[zlib_start:])

    print(f"Save state: {save_state_path}")
    print(f"Decompressed size: {len(state):,} bytes")

    # Find major data regions (non-zero areas)
    print("\n=== Finding major data regions ===")

    in_data = False
    regions = []
    region_start = 0
    window = 64
    threshold = 8

    for i in range(0, len(state) - window, window):
        chunk = state[i:i+window]
        non_zeros = sum(1 for b in chunk if b != 0)
        is_data = non_zeros >= threshold

        if is_data and not in_data:
            region_start = i
            in_data = True
        elif not is_data and in_data:
            regions.append((region_start, i))
            in_data = False

    if in_data:
        regions.append((region_start, len(state)))

    print(f"Found {len(regions)} major data regions:")
    for start, end in regions:
        size = end - start
        print(f"  0x{start:06x} - 0x{end:06x}  ({size:,} bytes)")

    # Score location
    score_offset = 0x02e756
    print(f"\n=== Score Analysis ===")
    print(f"Score offset: 0x{score_offset:06x}")

    # Read score bytes
    score_bytes = state[score_offset:score_offset+4]
    score_value = score_bytes[0]*1000 + score_bytes[1]*100 + score_bytes[2]*10 + score_bytes[3]
    print(f"Score bytes: {' '.join(f'{b:02x}' for b in score_bytes)}")
    print(f"Score value: {score_value}")

    # Find which region contains score
    for start, end in regions:
        if start <= score_offset < end:
            offset_in_region = score_offset - start
            print(f"\nScore is in region 0x{start:06x}-0x{end:06x}")
            print(f"Offset within region: 0x{offset_in_region:04x} ({offset_in_region:,} bytes)")
            break

    # Dump data around score
    print(f"\n=== Data around score (0x{score_offset:06x}) ===")
    start = score_offset - 128
    end = score_offset + 128
    for i in range(start, end, 32):
        row = state[i:i+32]
        hex_str = ' '.join(f'{b:02x}' for b in row[:16])
        marker = " <-- SCORE" if i <= score_offset < i + 32 else ""
        print(f"0x{i:06x}: {hex_str}{marker}")

if __name__ == "__main__":
    main()
