# Utilities

Helper functions available to all transformers.

**Location:** `transformers/utils/` directory in your [config directory](../getting-started/hub-setup.md#config-directory), with a barrel export via `utils/index.js`

## Import

```javascript
import { scaleLinear, randomInt, randomElement, hslToRgb, sleep, trackedTimeout, trackedInterval, formatNumber } from '../utils/index.js';
```

Or import from individual modules:

```javascript
import { scaleLinear, randomInt, randomElement, hslToRgb } from '../utils/math.js';
import { sleep, trackedTimeout, trackedInterval } from '../utils/async.js';
import { formatNumber } from '../utils/format.js';
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
