# Utilities

Helper functions available to all transformers via the `utils` object on the [transformer context](./index.md#context-object).

## Usage

Destructure the functions you need from `utils` in your transform function:

```javascript
export async function transform({ subject, property, payload }, { broadcast, utils }) {
  const { sleep, randomInt, formatNumber } = utils;

  if (subject === 'player' && property === 'score') {
    broadcast({
      effect: 'text',
      props: { text: formatNumber(payload), duration: 5000 },
    });
    return true;
  }
}
```

For functions needed at module level (e.g., `debounce`, `throttleLatest`, `exclusive`), use lazy initialization with `??=`:

```javascript
let throttledScore;

export async function transform({ subject, property, payload }, { broadcast, utils }) {
  const { throttleLatest } = utils;

  throttledScore ??= throttleLatest((score) => {
    broadcast({ effect: 'text', props: { text: score, reset: true } });
  }, 100);

  if (subject === 'player' && property === 'score') {
    throttledScore(payload);
    return true;
  }
}
```

## Math Functions

### scaleLinear

Create a linear scale function that maps an input domain to an output range.

```javascript
const scale = scaleLinear(0, 100, 0, 255);
scale(50);  // returns 127.5
scale(0);   // returns 0
scale(100); // returns 255
```

Useful for mapping game values (scores, health) to LED properties (brightness, position).

### randomInt

Return a random integer within a range (inclusive).

```javascript
randomInt(10);     // returns 0-10
randomInt(1, 10);  // returns 1-10
randomInt(5, 5);   // returns 5
```

### randomElement

Pick a random element from an array.

```javascript
randomElement(['red', 'green', 'blue']);  // returns one at random
```

### hslToRgb

Convert HSL color to a hex string. Note: `s` and `l` use the 0–1 range (not 0–100 like the context's `hslToHex`).

```javascript
hslToRgb(0, 1, 0.5);    // returns "#FF0000"
hslToRgb(120, 1, 0.5);  // returns "#00FF00"
```

### pick

Pick `count` random elements from an array (without duplicates).

```javascript
pick(['a', 'b', 'c', 'd', 'e'], 3);  // returns 3 random elements
```

## Async Functions

Always use these tracked functions instead of native `setTimeout` and `setInterval`. Tracked timers are automatically cancelled when the game exits, preventing stale callbacks from firing after a game change or reset.

### sleep

Pause execution for a specified duration.

```javascript
await sleep(100);  // wait 100ms
```

Useful for sequencing effects or adding delays between broadcasts.

### trackedTimeout

Tracked wrapper around `setTimeout`. Like `sleep`, the timer is tracked and auto-cancelled when the game exits.

```javascript
trackedTimeout(() => {
  bonusLatch = false;
}, 3000);
```

Useful for resetting flags or latches after a delay without blocking the transform function.

### trackedInterval

Tracked wrapper around `setInterval`. The interval is tracked and auto-cancelled when the game exits.

```javascript
trackedInterval(() => {
  pulse();
}, 1000);
```

Useful for repeating actions on a fixed schedule (e.g., periodic ambient effects).

### debounce

Create a leading-edge debounced function that fires on the first call then suppresses subsequent calls for a cooldown period. Useful for effects that shouldn't repeat too rapidly (e.g., explosion visuals from rapid enemy kills).

```javascript
const explode = debounce((color) => {
  broadcast({ effect: 'explode', props: { color } });
}, 500);

explode('red');   // fires
explode('blue');  // suppressed (within 500ms)
// After 500ms...
explode('green'); // fires
```

### throttleLatest

Create a leading+trailing throttle that fires immediately on the first call, then during rapid bursts suppresses intermediate calls and fires once more with the latest arguments after the cooldown expires. This guarantees the most recent value is always delivered.

```javascript
const updateScore = throttleLatest((score) => {
  broadcast({
    effect: 'text',
    props: { text: score, reset: true, duration: 5000 },
    drivers: [NAMED_DRIVERS.primaryMatrix],
  });
}, 100);

updateScore(100);   // fires immediately
updateScore(200);   // suppressed, schedules deferred
updateScore(300);   // suppressed, updates deferred args
// ~100ms later: fires with 300
```

Ideal for score displays where you want zero latency during normal gameplay but need to consolidate rapid bursts (end-of-level bonuses, rapid coin collection).

### exclusive

Wrap an async function so only the latest invocation runs. If called again while a previous call is still awaiting, the previous call's `cancelled()` check returns true, allowing it to bail out early.

```javascript
let goingInEffect;

export async function transform({ subject, property, payload }, { broadcast, utils }) {
  const { sleep, exclusive } = utils;

  goingInEffect ??= exclusive(async (cancelled, bcast) => {
    bcast({ effect: 'particle_field', props: { enabled: 'fadeIn' } });
    await sleep(500);
    if (cancelled()) return;
    bcast({ effect: 'scroll_text', props: { text: "I'm going in" } });
    await sleep(3500);
    if (cancelled()) return;
    bcast({ effect: 'particle_field', props: { enabled: 'fadeOut' } });
  });

  if (subject === 'game' && property === 'going-in') {
    goingInEffect(broadcast);
  }
}
```

### clearAllTimers

Cancel all pending `sleep()`, `trackedTimeout()`, and `trackedInterval()` timers. Called automatically by the transformer engine on game exit — you don't need to call this yourself.

## Formatting Functions

### formatNumber

Format a number with locale-appropriate thousands separators.

```javascript
formatNumber(12340);    // returns "12,340"
formatNumber("99850");  // returns "99,850"
formatNumber(1000000);  // returns "1,000,000"
```

Useful for displaying scores on matrix displays.
