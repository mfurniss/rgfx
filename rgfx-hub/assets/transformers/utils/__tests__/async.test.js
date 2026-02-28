import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { sleep, trackedTimeout, trackedInterval, throttleLatest, clearAllTimers } from '../async.js';

describe('sleep', () => {
  beforeEach(() => {
    clearAllTimers();
  });

  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms, got ${elapsed}ms`);
  });

  it('never resolves after clearAllTimers is called', async () => {
    let resolved = false;
    sleep(50).then(() => {
      resolved = true;
    });

    clearAllTimers();

    // Wait longer than the sleep duration
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(resolved, false, 'sleep should not have resolved');
  });

  it('resolves normally if clearAllTimers was called before it', async () => {
    clearAllTimers();

    // New sleep after clear should still work
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms, got ${elapsed}ms`);
  });
});

describe('trackedTimeout', () => {
  beforeEach(() => {
    clearAllTimers();
  });

  it('fires callback after the specified delay', async () => {
    let fired = false;
    trackedTimeout(() => {
      fired = true;
    }, 50);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(fired, true);
  });

  it('does not fire callback after clearAllTimers', async () => {
    let fired = false;
    trackedTimeout(() => {
      fired = true;
    }, 50);

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(fired, false, 'callback should not have fired');
  });

  it('returns a timer ID', () => {
    const id = trackedTimeout(() => {}, 1000);
    assert.ok(id !== undefined && id !== null);
    clearAllTimers();
  });
});

describe('trackedInterval', () => {
  beforeEach(() => {
    clearAllTimers();
  });

  it('fires callback repeatedly', async () => {
    let count = 0;
    trackedInterval(() => {
      count++;
    }, 30);

    await new Promise((r) => setTimeout(r, 100));
    assert.ok(count >= 2, `Expected >= 2 ticks, got ${count}`);
    clearAllTimers();
  });

  it('does not fire callback after clearAllTimers', async () => {
    let count = 0;
    trackedInterval(() => {
      count++;
    }, 30);

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(count, 0, 'callback should not have fired');
  });

  it('returns an interval ID', () => {
    const id = trackedInterval(() => {}, 1000);
    assert.ok(id !== undefined && id !== null);
    clearAllTimers();
  });
});

describe('clearAllTimers', () => {
  it('cancels a mix of sleeps and trackedTimeouts', async () => {
    let timeoutFired = false;
    let sleepResolved = false;

    trackedTimeout(() => {
      timeoutFired = true;
    }, 50);

    sleep(50).then(() => {
      sleepResolved = true;
    });

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(timeoutFired, false, 'trackedTimeout should not fire');
    assert.equal(sleepResolved, false, 'sleep should not resolve');
  });

  it('is safe to call when no timers are pending', () => {
    assert.doesNotThrow(() => clearAllTimers());
  });

  it('is safe to call multiple times', () => {
    sleep(1000);
    trackedTimeout(() => {}, 1000);
    assert.doesNotThrow(() => {
      clearAllTimers();
      clearAllTimers();
    });
  });

  it('does not affect untracked setTimeout', async () => {
    let fired = false;
    setTimeout(() => {
      fired = true;
    }, 50);

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(fired, true, 'untracked setTimeout should still fire');
  });
});

describe('throttleLatest', () => {
  beforeEach(() => {
    clearAllTimers();
  });

  it('fires immediately on first call', () => {
    const calls = [];
    const fn = throttleLatest((v) => calls.push(v), 100);

    fn('a');
    assert.deepEqual(calls, ['a']);
  });

  it('suppresses calls within the throttle window', async () => {
    const calls = [];
    const fn = throttleLatest((v) => calls.push(v), 100);

    fn('a');
    fn('b');
    fn('c');

    assert.deepEqual(calls, ['a'], 'only first call should fire immediately');
  });

  it('fires the latest value after the throttle window', async () => {
    const calls = [];
    const fn = throttleLatest((v) => calls.push(v), 50);

    fn('a');
    fn('b');
    fn('c');

    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(calls, ['a', 'c'], 'should fire first immediately, then latest after delay');
  });

  it('fires immediately again after the throttle window expires', async () => {
    const calls = [];
    const fn = throttleLatest((v) => calls.push(v), 50);

    fn('a');
    await new Promise((r) => setTimeout(r, 100));

    fn('b');
    assert.deepEqual(calls, ['a', 'b'], 'second call after cooldown should fire immediately');
  });

  it('does not fire deferred callback after clearAllTimers', async () => {
    const calls = [];
    const fn = throttleLatest((v) => calls.push(v), 50);

    fn('a');
    fn('b');

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(calls, ['a'], 'deferred call should have been cancelled');
  });

  it('passes all arguments to the callback', () => {
    const calls = [];
    const fn = throttleLatest((a, b, c) => calls.push([a, b, c]), 100);

    fn(1, 2, 3);
    assert.deepEqual(calls, [[1, 2, 3]]);
  });

  it('deferred call uses the latest arguments', async () => {
    const calls = [];
    const fn = throttleLatest((a, b) => calls.push([a, b]), 50);

    fn('x', 1);
    fn('y', 2);
    fn('z', 3);

    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(calls, [['x', 1], ['z', 3]]);
  });
});

describe('async chain cancellation', () => {
  beforeEach(() => {
    clearAllTimers();
  });

  it('stops an async chain mid-execution', async () => {
    const steps = [];

    (async () => {
      steps.push('before-sleep-1');
      await sleep(30);
      steps.push('after-sleep-1');
      await sleep(30);
      steps.push('after-sleep-2');
    })();

    // Let first sleep start, then cancel
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(steps, ['before-sleep-1']);

    clearAllTimers();

    // Wait for what would have been the full chain
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(
      steps,
      ['before-sleep-1'],
      'chain should have stopped after clearAllTimers',
    );
  });
});
