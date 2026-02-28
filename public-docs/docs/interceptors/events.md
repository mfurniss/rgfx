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

## Init Events { #init-events }

The RGFX framework automatically emits an init event when a game starts:

```
pacman/init pacman
```

The topic is `<gamename>/init` and the payload is the game name. This event is emitted approximately 500ms after the interceptor loads, giving time for MQTT connections to settle before effects start firing.

Init events **bypass boot delay** — they are delivered even while other events are suppressed during the power-on self test. This allows transformers to perform setup (loading sprites, initializing state) before gameplay begins.

You don't need to emit init events yourself — the framework handles this. Interceptors can focus on gameplay events.

!!! tip "Using init events in transformers"
    The init event is the recommended place to load [sprites](../transformers/bitmaps.md#caching-and-initialization) and reset game state. See [Writing Transformers](../transformers/writing-transformers.md) for the init handler pattern.

---

**Next:** [Transformers](../transformers/index.md) — how the Hub converts these events into LED effects
