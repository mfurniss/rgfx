# Event Monitor

!!! warning "Draft"
    This page is a placeholder and is under active development.

The Event Monitor displays real-time statistics for all game events received from MAME interceptors.

## Event Table

| Column | Description |
|--------|-------------|
| Event Topic | Hierarchical event path (e.g., `pacman/player/score`) |
| Count | Number of times this event occurred |
| Last Value | Most recent payload value |

The table is sortable by topic or count.

## Value Display

Numeric values in the 16-bit range (0-65535) show both decimal and hexadecimal representations (e.g., `2,500 (0x09C4)`).

## Click to Simulate

Click any event row to immediately re-trigger that event through the transformer pipeline. This is useful for testing effect mappings without running the game.

## Reset Counts

Click **Reset** to clear all event statistics and reset the events processed counter.
