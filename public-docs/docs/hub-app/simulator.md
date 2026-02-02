# Simulator

!!! warning "Draft"
    This page is a placeholder and is under active development.

The Simulator page provides manual event triggering for testing transformers without running MAME.

## Event Rows

Six configurable rows let you define and trigger events:

- **Event Input**: Enter event in `topic payload` format
- **Trigger**: Send the event immediately
- **Auto Trigger**: Optionally repeat at 1-second or 5-second intervals

### Event Format

```
game/subject/property/qualifier payload
```

Examples:

```
pacman/player/score 2500
galaga/enemy/destroyed
dkong/player/action jump
```

Press **Enter** in an event field to trigger it immediately.

## How It Works

Simulated events are processed through the same transformer pipeline as real MAME events, making this ideal for testing effect mappings.

## Persistence

Event configurations persist across sessions, so your test events are remembered when you reopen the Hub.
