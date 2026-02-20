/**
 * Async Utilities — with timer tracking for cleanup on game exit.
 *
 * All timers created by sleep() and trackedTimeout() are tracked so they
 * can be cancelled in bulk via clearAllTimers(). When cancelled, sleep
 * promises never resolve — the async chain stops in place and gets GC'd.
 */

/** @type {Set<ReturnType<typeof setTimeout>>} */
const activeTimers = new Set();

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
 * Cancel all pending sleep() and trackedTimeout() timers.
 * Sleep promises will never resolve — their async chains stop in place.
 * Called by the transformer engine on game exit.
 */
export function clearAllTimers() {
  for (const id of activeTimers) {
    clearTimeout(id);
  }
  activeTimers.clear();
}
