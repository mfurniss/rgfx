import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { sleep, trackedTimeout, trackedInterval, clearAllTimers } from '../async.js';

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
