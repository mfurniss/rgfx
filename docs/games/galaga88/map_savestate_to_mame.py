#!/usr/bin/env python3
"""
Map Galaga 88 save state offsets to MAME memory addresses.

MAME saves memory_share regions in alphabetical order by name.
We need to figure out what shares exist and their sizes.

Known from MAME namcos1.cpp:
- triram: 0x800 bytes (2KB) at MAME 0x2ff000
- c123tmap videoram: 0x8000 bytes (32KB) at MAME 0x2f0000
- mainram (work RAM): 0x8000 bytes (32KB) at MAME 0x300000

Save state offset 0x02e756 for score.
"""

import zlib
import sys
from collections import defaultdict

def analyze_save_state(path):
    with open(path, 'rb') as f:
        data = f.read()

    zlib_start = data.find(b'\x78\x9c')
    state = zlib.decompress(data[zlib_start:])

    print(f"Analyzing: {path}")
    print(f"Decompressed size: {len(state):,} bytes\n")

    score_offset = 0x02e756

    # Namco System 1 has these memory shares (alphabetical order likely):
    # - c117 bank offsets (internal state)
    # - mainram (work RAM) 32KB
    # - nvram (EEPROM) small
    # - paletteram (palette) 32KB
    # - spriteram (sprites) varies
    # - triram (shared) 2KB
    # - videoram (tilemaps) 32KB

    # Looking at the save state structure:
    # The first ~17KB has scattered data (CPU state, device registers)
    # Major data starts around 0x6b80 (65KB region = videoram 32KB + paletteram 32KB?)
    # Score at 0x02e756 is in a smaller scattered region

    # Let's approach this differently:
    # Find ALL occurrences of the score pattern across states

    print("=== Comparing all three save states ===")
    states = {}
    for i in [1, 2, 3]:
        state_path = f'/opt/homebrew/bin/sta/galaga88/{i}.sta'
        try:
            with open(state_path, 'rb') as f:
                d = f.read()
            zs = d.find(b'\x78\x9c')
            states[i] = zlib.decompress(d[zs:])
        except Exception as e:
            print(f"Could not load state {i}: {e}")

    if len(states) < 2:
        print("Need at least 2 states to compare")
        return

    # Known scores: state1=0, state2=660, state3=1180
    scores = {1: 0, 2: 660, 3: 1180}

    # Score format is unpacked BCD: [thousands][hundreds][tens][ones]
    def score_to_bytes(s):
        return bytes([s // 1000, (s % 1000) // 100, (s % 100) // 10, s % 10])

    print("\nExpected score bytes:")
    for i, s in scores.items():
        b = score_to_bytes(s)
        print(f"  State {i} (score {s}): {' '.join(f'{x:02x}' for x in b)}")

    # Verify our known offset
    print(f"\n=== Verifying score at offset 0x{score_offset:06x} ===")
    for i, s in states.items():
        actual = s[score_offset:score_offset+4]
        expected = score_to_bytes(scores[i])
        match = "MATCH" if actual == expected else "MISMATCH"
        print(f"  State {i}: got {' '.join(f'{x:02x}' for x in actual)}, expected {' '.join(f'{x:02x}' for x in expected)} -> {match}")

    # Now, let's figure out which MAME memory region this is in
    # by looking at the surrounding data structure

    print(f"\n=== Analyzing memory structure around score ===")
    s = states[2]  # Use state 2

    # The score is part of game state, likely in work RAM or triram
    # Work RAM is at MAME 0x300000, TRIRAM at 0x2ff000

    # Key observation: score_offset = 0x02e756
    # If this were in work RAM at offset X, then X = 0x2e756 - (start of work RAM in save state)

    # Let's look at the pattern of data regions and try to identify them
    print("\nLooking for 32KB aligned boundaries (RAM region starts):")

    # Find non-zero regions
    def find_data_starts(data, window=256, threshold=16):
        """Find offsets where significant data begins."""
        starts = []
        in_zeros = True
        for i in range(0, len(data) - window, window):
            chunk = data[i:i+window]
            non_zeros = sum(1 for b in chunk if b != 0)
            if non_zeros >= threshold and in_zeros:
                starts.append(i)
                in_zeros = False
            elif non_zeros < threshold:
                in_zeros = True
        return starts

    data_starts = find_data_starts(s)
    print(f"Data region starts: {[f'0x{x:06x}' for x in data_starts[:20]]}")

    # The score at 0x02e756 is 190,294 bytes into the file
    # If we assume the major RAM regions are:
    # - Palette (32KB = 0x8000)
    # - Videoram (32KB = 0x8000)
    # - Work RAM (32KB = 0x8000)
    # - Triram (2KB = 0x800)

    # Total would be ~98KB = 0x18800, but score is at 0x2e756 = 190KB

    # That suggests there's about 90KB of "other" stuff (CPU state, device state, etc.)
    # before the main RAM regions

    # Let's try a different approach: find data that looks like BCD scores
    # and see if there's a pattern

    print("\n=== MAME Address Calculation Hypothesis ===")

    # Looking at the data around 0x02e756:
    # The region is small (512 bytes) which matches TRIRAM behavior (2KB total)
    # TRIRAM in MAME is at 0x2ff000-0x2ff7ff

    # Hypothesis: The score is in TRIRAM
    # If score is at TRIRAM offset X, then MAME address = 0x2ff000 + X

    # From the region analysis, score is at offset 0x0116 within its data region
    # which starts at 0x02e640

    region_start = 0x02e640
    offset_in_region = score_offset - region_start
    print(f"Score region starts at: 0x{region_start:06x}")
    print(f"Score offset within region: 0x{offset_in_region:04x}")

    # If this IS triram (2KB), what would the MAME address be?
    triram_base = 0x2ff000
    mame_addr_if_triram = triram_base + offset_in_region
    print(f"\nIf TRIRAM (base 0x{triram_base:06x}): MAME address = 0x{mame_addr_if_triram:06x}")

    # If this is in work RAM (32KB at 0x300000)?
    workram_base = 0x300000
    # We'd need to know where work RAM starts in the save state
    # Looking at the data, the region 0x02e640 is small, not 32KB

    # Let's also check: could score be at a different location?
    # What if there are multiple copies?

    print("\n=== Searching for score pattern in all regions ===")
    score_pattern = score_to_bytes(660)  # State 2 score
    pos = 0
    matches = []
    while True:
        idx = s.find(score_pattern, pos)
        if idx == -1:
            break
        matches.append(idx)
        pos = idx + 1

    print(f"Found {len(matches)} occurrences of score pattern {' '.join(f'{x:02x}' for x in score_pattern)}:")
    for m in matches:
        print(f"  0x{m:06x}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else '/opt/homebrew/bin/sta/galaga88/2.sta'
    analyze_save_state(path)
