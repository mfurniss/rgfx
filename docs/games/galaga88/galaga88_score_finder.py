#!/usr/bin/env python3
"""
MAME Save State Score Finder for Galaga 88
Usage: python3 galaga88_score_finder.py <state1.sta> <score1> <state2.sta> <score2> ...

Finds memory addresses that correlate with known scores.
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

def find_score_bytes(states, scores):
    """Find bytes that match unpacked BCD score patterns."""
    results = []
    
    for i in range(len(states[0]) - 6):
        match = True
        for state, score in zip(states, scores):
            # Convert score to unpacked BCD digits (big-endian)
            digits = []
            s = score
            for _ in range(6):
                digits.insert(0, s % 10)
                s //= 10
            
            # Check if bytes match expected digits
            state_bytes = list(state[i:i+6])
            if state_bytes != digits:
                match = False
                break
        
        if match:
            results.append(i)
    
    return results

def main():
    if len(sys.argv) < 5 or len(sys.argv) % 2 != 1:
        print(__doc__)
        sys.exit(1)
    
    # Parse arguments
    state_files = []
    scores = []
    for i in range(1, len(sys.argv), 2):
        state_files.append(sys.argv[i])
        scores.append(int(sys.argv[i+1]))
    
    # Load and decompress states
    print("Loading save states...")
    states = []
    for f in state_files:
        states.append(decompress_mame_state(f))
        print(f"  {f}: {len(states[-1])} bytes")
    
    # Find score locations
    print("\nSearching for score patterns...")
    results = find_score_bytes(states, scores)
    
    if results:
        print(f"\nFound {len(results)} potential score location(s):")
        for offset in results:
            print(f"  Save state offset: 0x{offset:06x}")
            print(f"  Bytes at this location:")
            for j, (state, score) in enumerate(zip(states, scores)):
                print(f"    State {j+1} (score {score}): {list(state[offset:offset+6])}")
    else:
        print("No matches found")

if __name__ == "__main__":
    main()
