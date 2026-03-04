# Writing Transformers

This guide walks through creating a custom transformer for a game that already has a working interceptor.

!!! tip "Prerequisite"
    Your game needs a working interceptor before you can write a transformer. See [Writing Interceptors](../interceptors/writing-interceptors.md) if you haven't done that yet.

## Step 1: Check Your Events

Before writing any code, see what events the interceptor emits. Open the Hub's [Event Monitor](../hub-app/event-monitor.md), launch the game, and play through a few lives.

Each event appears as a row with its topic and payload. Note the patterns — for example, a game might emit:

| Topic | Payload |
|-------|---------|
| `mygame/player/score` | `1000` |
| `mygame/player/die` | |
| `mygame/enemy/destroy` | |
| `mygame/level/complete` | `2` |

The topic structure is `namespace/subject/property` with an optional qualifier. The payload is the event's value. These are what your transformer will match against.

## Step 2: Create the File

Create a new file in the `transformers/games/` folder of your [config directory](../getting-started/hub-setup.md#config-directory). The filename must match the ROM name:

```javascript
// transformers/games/mygame.js

export async function transform({ subject, property, qualifier, payload }, { broadcast }) {
  // Handle events here
  return false;
}
```

Key points:

- Export an `async function transform` — `async` allows using `await` for effect sequencing
- The first argument is the parsed topic: `subject`, `property`, `qualifier`, and `payload`
- The second argument is the [context object](index.md#context-object) — destructure what you need
- Return a truthy value to claim the event and stop the [cascade](index.md#cascade-system). Return `false` to pass it to the next handler.

## Step 3: Handle Events

Match events by checking `subject` and `property`, then call `broadcast()` with an effect payload:

```javascript
export async function transform({ subject, property, payload }, { broadcast }) {
  if (subject === 'player' && property === 'score' && Number(payload) > 0) {
    return broadcast({
      effect: 'text',
      props: {
        text: payload,
        gradient: ['#FFFF00'],
        duration: 5000,
        reset: true,
      },
    });
  }

  if (subject === 'player' && property === 'die') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000',
        duration: 1000,
        easing: 'quinticOut',
        fade: true,
      },
    });
  }

  return false;
}
```

`broadcast()` returns a truthy value, so `return broadcast(...)` both sends the effect and claims the event in one line.

!!! tip "Throttle rapid score events"
    Some games emit score events very rapidly during bonus phases or end-of-level counting. Use [`throttleLatest()`](utils.md#throttlelatest) to consolidate these bursts — the first event fires immediately (zero latency during normal play) and rapid follow-ups are collapsed into a single broadcast of the final value:

    ```javascript
    let updateScore;

    export async function transform({ subject, property, payload }, { broadcast, utils }) {
      const { throttleLatest } = utils;

      updateScore ??= throttleLatest((score) => {
        broadcast({
          effect: 'text',
          props: { text: score, gradient: ['#FFFF00'], duration: 5000, reset: true },
        });
      }, 100);

      if (subject === 'player' && property === 'score') {
        updateScore(payload);
        return true;
      }

      return false;
    }
    ```

See [Visual Effects](../hardware/effects.md) for the full list of effects and their parameters.

## Step 4: Target Drivers

Without a `drivers` property, `broadcast()` sends to all connected drivers. To target specific drivers, import driver groups from `global.js`:

```javascript
import { MATRIX_DRIVERS, STRIP_DRIVERS, NAMED_DRIVERS } from '../global.js';
```

The [Global Configuration](global.md) file defines your driver groups. Use them to send different effects to different hardware:

```javascript
// Score text on the primary matrix
broadcast({
  effect: 'text',
  drivers: [NAMED_DRIVERS.primaryMatrix],
  props: { text: payload, gradient: ['#FFFF00'], duration: 5000, reset: true },
});

// Pulse on all strips
broadcast({
  effect: 'pulse',
  drivers: STRIP_DRIVERS,
  props: { color: '#FF0000', duration: 800, fade: true },
});
```

Wildcards send to a randomly chosen driver:

| Wildcard | Target |
|----------|--------|
| `*S` | Random strip driver |
| `*M` | Random matrix driver |
| `*` | Random driver (any type) |

Use multiple wildcards to hit multiple random drivers: `drivers: ['*', '*']`.

## Step 5: Sequence Effects

Use `await` with `sleep()` to create multi-step effect sequences:

```javascript
// In your transform function:
const { sleep } = utils;

if (subject === 'level' && property === 'complete') {
  await sleep(2000);  // Wait for the game's own animation

  for (let i = 0; i < 8; i++) {
    broadcast({
      effect: 'background',
      props: {
        gradient: { colors: [i & 1 ? '#0000A0' : '#909090'] },
        fadeDuration: 0,
      },
    });
    await sleep(180);
  }

  // Turn off background
  broadcast({
    effect: 'background',
    props: { gradient: { colors: [] }, fadeDuration: 0 },
  });
}
```

`sleep()` pauses the transformer function without blocking other events — the Hub handles events concurrently. All timers from `sleep()` and `trackedTimeout()` are tracked and auto-cancelled when the game exits.

For delayed actions that don't need to block the function (e.g., resetting a flag after a cooldown), use [`trackedTimeout()`](utils.md#trackedtimeout) instead of `sleep()`:

```javascript
let bonusLatch = false;

// Inside your transform function:
const { trackedTimeout } = utils;

bonusLatch = true;
trackedTimeout(() => {
  bonusLatch = false;
}, 3000);
```

!!! warning "Do not use setTimeout or setInterval"
    Always use `sleep()`, `trackedTimeout()`, and `trackedInterval()` from the [`utils`](utils.md) context object instead of the native `setTimeout` and `setInterval`. The utils versions are tracked by the transformer engine and automatically cancelled when the game exits. Native timers would continue firing after the game ends, causing stale effects on your LEDs.

## Step 6: Handle Initialization

The RGFX framework emits an [init event](../interceptors/events.md#init-events) when a game starts. Use it to load sprites, reset state, or perform one-time setup:

```javascript
let mySprite;

export async function transform({ subject, property, payload }, { broadcast, loadSprite }) {
  if (subject === 'init') {
    mySprite = await loadSprite('bitmaps/my-sprite.json');
    return true;
  }

  // Fallback: load on first event if init was missed
  if (!mySprite) {
    mySprite = await loadSprite('bitmaps/my-sprite.json');
  }

  // Handle gameplay events...
  return false;
}
```

The init handler is also useful for resetting transformer state — clearing cached sprites forces them to reload, which is helpful during development when sprite extraction output changes.

See [Bitmaps](bitmaps.md#caching-and-initialization) for more on sprite loading and caching patterns.

## Step 7: Test

Save the file. The Hub watches the transformers directory and reloads changes immediately — no restart needed.

Three ways to test without replaying the game:

- **Event Monitor** — click any event row to replay it, triggering your transformer
- **[Simulator](../hub-app/simulator.md)** — set up events with auto-trigger intervals for repeated testing
- **[FX Playground](../hub-app/fx-playground.md)** — experiment with effect parameters visually before coding them into your transformer

!!! note
    Changes to `global.js` or anything in `utils/` trigger a full reload of all loaded transformers.
