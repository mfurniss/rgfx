# Transformers

Transformers are JavaScript modules that convert game events into LED effects. They act as the bridge between game state changes and visual feedback on your LED hardware.

## How Transformers Work

When MAME [interceptors](../interceptors/index.md) detect game events, they emit events with topics like `pacman/player/score/p1` to a log file. The Hub's transformer engine picks up these events and routes them through a cascade of handlers until one claims the event and broadcasts the appropriate effect to drivers.

```
Game Event → Transformer Engine → Effect Payload → LED Drivers
```

## Cascade System

Events flow through four handler levels. The first handler to return a truthy value stops the cascade.

### 1. Game Transformers (Highest Priority)

Game-specific handlers for individual games.

**Location:** `transformers/games/` in your [config directory](../getting-started/hub-setup.md#config-directory)

**Examples:** `pacman.js`, `galaga.js`, `robotron.js`, `starwars.js`

### 2. Subject Transformers

Generic handlers for common event subjects that appear across multiple games.

**Location:** `transformers/subjects/`

**Available:**

- `audio.js` - FFT spectrum events for audio visualization
- `ambilight.js` - Screen edge colors for ambient lighting
- `init.js` - Game initialization handler (displays world record scores)
- `sound.js` - NES APU sound channel events
- `player.js` - Generic player events (disabled by default)
- `enemy.js` - Enemy-related events

### 3. Property Transformers

Generic handlers that match events by property name, applying across all games.

**Location:** `transformers/properties/`

### 4. Default Transformer (Lowest Priority)

Catch-all for unmatched events.

**Location:** `transformers/default.js`

## Writing Transformers

Transformers export a `transform` function that receives the parsed topic and a context object.

### Topic Structure

```javascript
{
  raw: "pacman/player/score/p1",  // Original topic
  namespace: "pacman",            // Game name or "rgfx"
  subject: "player",              // Entity type
  property: "score",              // Event type
  qualifier: "p1",                // Optional context
  payload: "1000"                 // Event value
}
```

### Basic Example

```javascript
export function transform({ subject, property, payload }, { broadcast }) {
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: '#FFFF00', duration: 500 }
    });
  }

  return false;
}
```

### Context Object

The context provides services for transformers:

| Service | Description |
|---------|-------------|
| `broadcast(payload)` | Send effect to drivers |
| `udp` | UDP client for direct effect broadcasting with lower-level control |
| `mqtt` | MQTT client for publishing messages to the broker |
| `http` | HTTP client with `get()`, `post()`, `put()`, `delete()` for external APIs |
| `state` | Key-value store for tracking game state |
| `log` | Logger (debug, info, warn, error) |
| `drivers` | Registry of connected drivers |
| `loadGif(path)` | Load GIF for bitmap effects |
| `loadSprite(path)` | Load JSON sprite for bitmap effects |
| `parseAmbilight(payload)` | Parse ambilight color data |
| `hslToHex(h, s, l)` | Convert HSL to hex color (h: 0–360, s: 0–100, l: 0–100) |

## Broadcasting Effects

The `broadcast` function sends effects to drivers.

### Broadcast to All Drivers

```javascript
broadcast({
  effect: 'pulse',
  props: { color: '#FF0000', duration: 300 }
});
```

### Target Specific Drivers

```javascript
broadcast({
  effect: 'text',
  drivers: ['rgfx-driver-0001', 'rgfx-driver-0005'],
  props: { text: 'GAME OVER', color: '#FF0000' }
});
```

### Wildcard Targeting

| Wildcard | Description |
|----------|-------------|
| `*S` | Random strip driver |
| `*M` | Random matrix driver |
| `*` | Random driver (any type) |

```javascript
broadcast({
  effect: 'spectrum',
  drivers: ['*M'],  // Send to a random matrix
  props: { bands: 16 }
});
```

## State Management

Use `context.state` to track game state across events.

```javascript
export function transform({ property, payload }, { broadcast, state }) {
  if (property === 'score') {
    const lastScore = state.get('lastScore') || 0;
    const newScore = parseInt(payload);

    // Only trigger effect on score increase
    if (newScore > lastScore) {
      state.set('lastScore', newScore);
      return broadcast({ effect: 'pulse', props: { color: '#FFFF00' } });
    }
  }
  return false;
}
```

## File Location

Transformers are stored in the `transformers/` subdirectory of your config directory:

```
transformers/
├── default.js
├── games/
│   ├── pacman.js
│   ├── galaga.js
│   └── ...
├── subjects/
│   ├── audio.js
│   ├── ambilight.js
│   └── ...
└── properties/
    └── ...
```

## Hot Reload

The Hub watches the transformers directory for changes. Edit a game transformer and the change takes effect immediately without restarting.

Changes to shared files — `global.js` and anything in `utils/` — trigger a full reload of **all** loaded transformers, since any transformer may import from these modules. Changes to `.json` files in `bitmaps/` also trigger a full reload, so updated [sprite extractions](../interceptors/sprite-extraction.md) take effect immediately.

## Next Step

For a complete walkthrough of creating a game transformer from scratch, see the [Writing Transformers](writing-transformers.md) guide.
