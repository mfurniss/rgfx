# Event System

Every interceptor uses `_G.event()` to report what's happening in the game. Events are written to a log file that RGFX Hub monitors.

## Usage

`_G.event` is a global function defined by the RGFX framework — it's available in every interceptor without requiring an import.

```lua
_G.event(topic, message)
```

**Parameters:**

- `topic` — A path-like string describing the event (validated against the format rules below)
- `message` — The event data (string, number, or nil)

## Topic Format

Topics use a hierarchical path structure:

- 1 to 4 segments separated by `/`
- Lowercase letters, numbers, hyphens, and underscores only
- No leading or trailing slashes

**Examples:**

```lua
_G.event("galaga/player/score/p1", 12500)
_G.event("galaga/stage", 3)
_G.event("galaga/player/captured")
```

## Event Log

Events are written to `interceptor-events.log` in your [config directory](../getting-started/hub-setup.md#config-directory), one per line. Each line is the topic followed by the message (if any), separated by a space:

```
galaga/player/score/p1 12500
galaga/stage 3
galaga/player/captured
```

The Hub watches this file and processes events as they arrive. The file is recreated each time MAME starts.
