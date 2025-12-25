#!/usr/bin/env python3
"""
Analyze MAME save state structure to find memory region mappings.
"""

import sys
import zlib

def decompress_mame_state(filepath):
    """Decompress a MAME save state file."""
    with open(filepath, 'rb') as f:
        data = f.read()
    idx = data.find(b'\x78\x9c')
    if idx == -1:
        raise ValueError(f"No zlib header found in {filepath}")
    return zlib.decompress(data[idx:])

def main():
    state_file = sys.argv[1] if len(sys.argv) > 1 else '/opt/homebrew/bin/sta/galaga88/2.sta'
    score_offset = int(sys.argv[2], 16) if len(sys.argv) > 2 else 0x02e756

    print(f"Analyzing: {state_file}")
    data = decompress_mame_state(state_file)
    print(f"Decompressed size: {len(data)} bytes")

    # Look at the data around score offset
    print(f"\nData around score (offset 0x{score_offset:06x}):")
    print("Hex dump:")
    for i in range(-64, 64, 16):
        start = score_offset + i
        if start >= 0 and start + 16 <= len(data):
            hex_str = ' '.join(f'{data[start+j]:02x}' for j in range(16))
            ascii_str = ''.join(chr(data[start+j]) if 32 <= data[start+j] < 127 else '.' for j in range(16))
            print(f"  0x{start:06x}: {hex_str}  {ascii_str}")

    # Search for memory region markers
    print("\nSearching for memory region markers...")
    markers = [b'workram', b'WORKRAM', b'mainram', b'MAINRAM', b'triram', b'TRIRAM',
               b'maincpu', b'subcpu', b'soundcpu', b'mcu', b'program', b'nvram']
    for marker in markers:
        idx = 0
        while True:
            idx = data.find(marker, idx)
            if idx == -1:
                break
            print(f"  Found '{marker.decode()}' at offset 0x{idx:06x}")
            # Show context
            start = max(0, idx - 16)
            end = min(len(data), idx + len(marker) + 32)
            context = data[start:end]
            print(f"    Context: {context[:60]}")
            idx += 1

if __name__ == "__main__":
    main()
