/**
 * Async Utilities — with timer tracking for cleanup on game exit.
 *
 * All timers created by sleep(), trackedTimeout(), and trackedInterval()
 * are tracked so they can be cancelled in bulk via clearAllTimers().
 * When cancelled, sleep promises never resolve — the async chain stops
 * in place and gets GC'd.
 */

/** @type {Set<ReturnType<typeof setTimeout>>} */
const activeTimers = new Set();

/** @type {Set<ReturnType<typeof setInterval>>} */
const activeIntervals = new Set();

/**
 * Sleep for a specified duration. The timer is tracked so it can be
 * cancelled by clearAllTimers() on game exit.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 *
 * @example
 * await sleep(100);
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      activeTimers.delete(id);
      resolve();
    }, ms);
    activeTimers.add(id);
  });
}

/**
 * Tracked wrapper around setTimeout. The timer is tracked so it can be
 * cancelled by clearAllTimers() on game exit.
 *
 * @param {Function} fn - Callback to execute after delay
 * @param {number} ms - Delay in milliseconds
 * @returns {ReturnType<typeof setTimeout>} Timer ID (can also be cleared manually)
 *
 * @example
 * trackedTimeout(() => { latch = false; }, 3000);
 */
export function trackedTimeout(fn, ms) {
  const id = setTimeout(() => {
    activeTimers.delete(id);
    fn();
  }, ms);
  activeTimers.add(id);
  return id;
}

/**
 * Tracked wrapper around setInterval. The interval is tracked so it can be
 * cancelled by clearAllTimers() on game exit.
 *
 * @param {Function} fn - Callback to execute on each interval
 * @param {number} ms - Interval in milliseconds
 * @returns {ReturnType<typeof setInterval>} Interval ID (can also be cleared manually)
 *
 * @example
 * trackedInterval(() => { pulse(); }, 1000);
 */
export function trackedInterval(fn, ms) {
  const id = setInterval(fn, ms);
  activeIntervals.add(id);
  return id;
}

/**
 * Create a debounced version of a function that suppresses repeated calls
 * within a cooldown period (leading-edge). Uses trackedTimeout so the
 * internal timer is cancelled on game exit.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Cooldown period in milliseconds
 * @returns {Function} Debounced function — invokes fn on first call, suppresses subsequent calls until cooldown expires
 *
 * @example
 * const explode = debounce((color) => { broadcast({ color }); }, 500);
 * explode('red');  // fires
 * explode('blue'); // suppressed (within 500ms)
 */
export function debounce(fn, ms) {
  let ready = true;
  return (...args) => {
    if (!ready) return;
    ready = false;
    trackedTimeout(() => { ready = true; }, ms);
    fn(...args);
  };
}

/**
 * Leading+trailing throttle that always delivers the latest arguments.
 * First call fires immediately (zero latency). During rapid bursts,
 * intermediate calls are suppressed and a single deferred call fires
 * with the most recent arguments after the cooldown expires.
 *
 * @param {Function} fn - Function to throttle
 * @param {number} ms - Minimum interval between invocations
 * @returns {Function} Throttled function
 *
 * @example
 * const update = throttleLatest((score) => { render(score); }, 100);
 * update(100);  // fires immediately
 * update(200);  // suppressed, schedules deferred
 * update(300);  // suppressed, updates deferred args
 * // ~100ms later: fires with 300
 */
export function throttleLatest(fn, ms) {
  let timerId = null;
  let latestArgs = null;
  let lastFired = 0;
  return (...args) => {
    latestArgs = args;
    const now = Date.now();
    if (now - lastFired >= ms) {
      lastFired = now;
      fn(...args);
    } else if (timerId === null) {
      const delay = ms - (now - lastFired);
      timerId = trackedTimeout(() => {
        timerId = null;
        lastFired = Date.now();
        fn(...latestArgs);
      }, delay);
    }
  };
}

/**
 * Wrap an async function so only the latest invocation runs.
 * If called again while a previous call is still awaiting, the
 * previous call's `cancelled()` check returns true, allowing it
 * to bail out early.
 *
 * @param {(cancelled: () => boolean, ...args: any[]) => Promise<any>} fn
 * @returns {(...args: any[]) => Promise<any>}
 *
 * @example
 * const flashColors = exclusive(async (cancelled, colors) => {
 *   for (const color of colors) {
 *     if (cancelled()) break;
 *     broadcast({ effect: 'background', props: { color } });
 *     await sleep(70);
 *   }
 * });
 * flashColors(['#FF0000', '#00FF00']); // starts
 * flashColors(['#0000FF', '#FFFF00']); // cancels previous, starts new
 */
export function exclusive(fn) {
  let gen = 0;
  return (...args) => {
    const mine = ++gen;
    return fn(() => mine !== gen, ...args);
  };
}

/**
 * Cancel all pending sleep(), trackedTimeout(), and trackedInterval() timers.
 * Sleep promises will never resolve — their async chains stop in place.
 * Called by the transformer engine on game exit.
 */
export function clearAllTimers() {
  for (const id of activeTimers) {
    clearTimeout(id);
  }
  activeTimers.clear();
  for (const id of activeIntervals) {
    clearInterval(id);
  }
  activeIntervals.clear();
}
