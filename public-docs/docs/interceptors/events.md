# Event System

Every interceptor uses the global `event()` function to report what's happening in the game. Events are written to a log file that RGFX Hub monitors.

## Usage

```lua
event(topic, payload)
```

**Parameters:**

- `topic` — A path-like string describing the event
- `payload` — The event data (string, number, or nil)

## Topic Format

Topics use a hierarchical path structure:

- 1 to 4 segments separated by `/`
- Lowercase letters, numbers, hyphens, and underscores only
- No leading or trailing slashes

**Examples:**

```lua
event("mygame/player/score", 2500)
event("mygame/player/action", "jump")
event("mygame/enemy/destroyed")
event("rgfx/ambilight/top", "FF0000,00FF00,0000FF")
```

## Event Log

Events are written to `interceptor_events.log` in your [config directory](../getting-started/hub-setup.md#config-directory):

```
topic payload
topic payload
```

The Hub watches this file and processes events as they arrive. The file is recreated each time MAME starts.
