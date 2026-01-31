# Utilities

Helper functions available to all transformers.

**Location:** `~/.rgfx/transformers/utils.js`

## Import

```javascript
import { scaleLinear, sleep, randomInt, formatNumber } from '../utils.js';
```

Or import from individual modules:

```javascript
import { scaleLinear, randomInt } from '../utils/math.js';
import { sleep } from '../utils/async.js';
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

## Async Functions

### sleep

Pause execution for a specified duration.

```javascript
await sleep(100);  // wait 100ms
```

Useful for sequencing effects or adding delays between broadcasts.

## Formatting Functions

### formatNumber

Format a number with locale-appropriate thousands separators.

```javascript
formatNumber(12340);    // returns "12,340"
formatNumber("99850");  // returns "99,850"
formatNumber(1000000);  // returns "1,000,000"
```

Useful for displaying scores on matrix displays.
