#!/usr/bin/env python3
"""
Find the MAME virtual address for Galaga 88 score.

Strategy:
1. We know the score is at save state offset 0x02e756
2. We know the RAM regions and their MAME addresses
3. We need to figure out which region contains offset 0x02e756

The save state contains regions in registration order. Let's analyze
the structure to find region boundaries.
"""

import zlib

def load_state(path):
    with open(path, 'rb') as f:
        data = f.read()
    zlib_start = data.find(b'\x78\x9c')
    return zlib.decompress(data[zlib_start:])

def find_region_boundaries(data):
    """Find where data regions start/end by looking for transitions."""
    boundaries = []
    in_zeros = True
    zero_start = 0

    for i in range(0, len(data), 256):
        chunk = data[i:i+256]
        non_zeros = sum(1 for b in chunk if b != 0)

        if non_zeros < 8 and not in_zeros:
            # Entering zero region
            in_zeros = True
            zero_start = i
        elif non_zeros >= 8 and in_zeros:
            # Entering data region
            if i - zero_start > 1024:  # Significant gap
                boundaries.append(i)
            in_zeros = False

    return boundaries

def main():
    states = {}
    scores = {1: 0, 2: 660, 3: 1180}

    for i in [1, 2, 3]:
        states[i] = load_state(f'/opt/homebrew/bin/sta/galaga88/{i}.sta')

    score_offset = 0x02e756

    print("=== Save State Analysis ===")
    print(f"Decompressed size: {len(states[2]):,} bytes")
    print(f"Score offset: 0x{score_offset:06x} ({score_offset:,} bytes)")

    # Verify score location
    print("\n=== Score Verification ===")
    for i, state in states.items():
        b = state[score_offset:score_offset+4]
        score = b[0]*1000 + b[1]*100 + b[2]*10 + b[3]
        print(f"State {i}: bytes {list(b)} = {score} (expected {scores[i]})")

    # Find all 4-byte sequences that differ between states in the expected way
    print("\n=== Finding All Score Candidates ===")
    print("Looking for addresses where state2-state1 and state3-state1 match score differences...")

    s1, s2, s3 = states[1], states[2], states[3]

    # Score differences
    # State 2 - State 1 = 660
    # State 3 - State 1 = 1180

    candidates = []

    # Check for unpacked BCD format (4 bytes, each 0-9)
    for offset in range(len(s1) - 4):
        b1 = s1[offset:offset+4]
        b2 = s2[offset:offset+4]
        b3 = s3[offset:offset+4]

        # Check if all bytes are valid BCD digits (0-9)
        if all(x <= 9 for x in b1) and all(x <= 9 for x in b2) and all(x <= 9 for x in b3):
            # Calculate scores
            score1 = b1[0]*1000 + b1[1]*100 + b1[2]*10 + b1[3]
            score2 = b2[0]*1000 + b2[1]*100 + b2[2]*10 + b2[3]
            score3 = b3[0]*1000 + b3[1]*100 + b3[2]*10 + b3[3]

            if score1 == scores[1] and score2 == scores[2] and score3 == scores[3]:
                candidates.append((offset, 'unpacked_bcd_4', b1, b2, b3))

    # Also check for 6-byte unpacked BCD (like original Galaga)
    for offset in range(len(s1) - 6):
        b1 = s1[offset:offset+6]
        b2 = s2[offset:offset+6]
        b3 = s3[offset:offset+6]

        if all(x <= 9 for x in b1) and all(x <= 9 for x in b2) and all(x <= 9 for x in b3):
            score1 = b1[0]*100000 + b1[1]*10000 + b1[2]*1000 + b1[3]*100 + b1[4]*10 + b1[5]
            score2 = b2[0]*100000 + b2[1]*10000 + b2[2]*1000 + b2[3]*100 + b2[4]*10 + b2[5]
            score3 = b3[0]*100000 + b3[1]*10000 + b3[2]*1000 + b3[3]*100 + b3[4]*10 + b3[5]

            if score1 == scores[1] and score2 == scores[2] and score3 == scores[3]:
                candidates.append((offset, 'unpacked_bcd_6', b1, b2, b3))

    print(f"\nFound {len(candidates)} candidate locations:")
    for offset, fmt, b1, b2, b3 in candidates:
        print(f"  0x{offset:06x}: {fmt} - {list(b2)}")

    # Now map these offsets to MAME addresses
    # Known RAM regions in Namco System 1 (sizes):
    # - Palette RAM: 32KB (0x8000)
    # - Tilemap RAM: 32KB (0x8000)
    # - Scratchpad: 2KB (0x800)
    # - Sprite RAM: 2KB (0x800)
    # - Sound RAM: 1KB (0x400)
    # - TRIRAM: 2KB (0x800)
    # - Work RAM: 32KB (0x8000)
    # Plus CPU state, device state, etc.

    print("\n=== Mapping to MAME Addresses ===")

    # The key insight: look at surrounding data to identify the region
    if candidates:
        offset = candidates[0][0]

        # Dump 256 bytes around the score to see context
        print(f"\nContext around score at 0x{offset:06x}:")
        start = max(0, offset - 64)
        for i in range(start, min(len(s2), offset + 64), 16):
            hex_bytes = ' '.join(f'{b:02x}' for b in s2[i:i+16])
            marker = " <-- SCORE" if offset <= i < offset + 4 else ""
            print(f"  0x{i:06x}: {hex_bytes}{marker}")

        # Find region boundaries near the score
        print("\n=== Region Analysis ===")

        # Scan backwards to find start of data region
        region_start = offset
        for i in range(offset, 0, -256):
            chunk = s2[i:i+256]
            if sum(1 for b in chunk if b != 0) < 8:
                region_start = i + 256
                break

        # Scan forwards to find end of data region
        region_end = offset
        for i in range(offset, len(s2), 256):
            chunk = s2[i:i+256]
            if sum(1 for b in chunk if b != 0) < 8:
                region_end = i
                break

        region_size = region_end - region_start
        offset_in_region = offset - region_start

        print(f"Data region: 0x{region_start:06x} - 0x{region_end:06x} ({region_size:,} bytes)")
        print(f"Score offset within region: 0x{offset_in_region:04x}")

        # Now figure out which MAME region this could be
        print("\n=== Possible MAME Address Mappings ===")

        regions = [
            ("Work RAM", 0x300000, 0x8000),
            ("TRIRAM", 0x2ff000, 0x800),
            ("Tilemap RAM", 0x2f0000, 0x8000),
            ("Scratchpad", 0x2fc000, 0x800),
            ("Sprite RAM", 0x2fc800, 0x800),
        ]

        for name, base, size in regions:
            if offset_in_region < size:
                mame_addr = base + offset_in_region
                print(f"  If {name}: 0x{mame_addr:06x}")

        # Check if region size matches any known region
        print(f"\nRegion size {region_size:,} bytes matches:")
        if 0x7800 <= region_size <= 0x8800:
            print("  - Work RAM (32KB) or Tilemap RAM (32KB)")
        elif 0x700 <= region_size <= 0x900:
            print("  - TRIRAM (2KB), Scratchpad (2KB), or Sprite RAM (2KB)")

if __name__ == "__main__":
    main()
