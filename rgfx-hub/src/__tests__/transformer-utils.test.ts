import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerUtils } from '../transformer-utils';

function createUtils() {
  return createTransformerUtils();
}

describe('sleep', () => {
  let utils: ReturnType<typeof createUtils>;

  beforeEach(() => {
    utils = createUtils();
  });

  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await utils.utils.sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('never resolves after clearAllTimers is called', async () => {
    let resolved = false;
    void utils.utils.sleep(50).then(() => {
      resolved = true;
    });

    utils.clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(resolved).toBe(false);
  });

  it('resolves normally if clearAllTimers was called before it', async () => {
    utils.clearAllTimers();

    const start = Date.now();
    await utils.utils.sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('trackedTimeout', () => {
  let utils: ReturnType<typeof createUtils>;

  beforeEach(() => {
    utils = createUtils();
  });

  it('fires callback after the specified delay', async () => {
    let fired = false;
    utils.utils.trackedTimeout(() => {
      fired = true;
    }, 50);

    await new Promise((r) => setTimeout(r, 100));
    expect(fired).toBe(true);
  });

  it('does not fire callback after clearAllTimers', async () => {
    let fired = false;
    utils.utils.trackedTimeout(() => {
      fired = true;
    }, 50);

    utils.clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(fired).toBe(false);
  });

  it('returns a timer ID', () => {
    const id = utils.utils.trackedTimeout(() => undefined, 1000);
    expect(id).toBeDefined();
    utils.clearAllTimers();
  });
});

describe('trackedInterval', () => {
  let utils: ReturnType<typeof createUtils>;

  beforeEach(() => {
    utils = createUtils();
  });

  it('fires callback repeatedly', async () => {
    let count = 0;
    utils.utils.trackedInterval(() => {
      count++;
    }, 30);

    await new Promise((r) => setTimeout(r, 100));
    expect(count).toBeGreaterThanOrEqual(2);
    utils.clearAllTimers();
  });

  it('does not fire callback after clearAllTimers', async () => {
    let count = 0;
    utils.utils.trackedInterval(() => {
      count++;
    }, 30);

    utils.clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(count).toBe(0);
  });

  it('returns an interval ID', () => {
    const id = utils.utils.trackedInterval(() => undefined, 1000);
    expect(id).toBeDefined();
    utils.clearAllTimers();
  });
});

describe('clearAllTimers', () => {
  it('cancels a mix of sleeps and trackedTimeouts', async () => {
    const { utils: u, clearAllTimers } = createUtils();
    let timeoutFired = false;
    let sleepResolved = false;

    u.trackedTimeout(() => {
      timeoutFired = true;
    }, 50);

    void u.sleep(50).then(() => {
      sleepResolved = true;
    });

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(timeoutFired).toBe(false);
    expect(sleepResolved).toBe(false);
  });

  it('is safe to call when no timers are pending', () => {
    const { clearAllTimers } = createUtils();
    expect(() => {
      clearAllTimers();
    }).not.toThrow();
  });

  it('is safe to call multiple times', () => {
    const { utils: u, clearAllTimers } = createUtils();
    void u.sleep(1000);
    u.trackedTimeout(() => undefined, 1000);
    expect(() => {
      clearAllTimers();
      clearAllTimers();
    }).not.toThrow();
  });

  it('does not affect untracked setTimeout', async () => {
    const { clearAllTimers } = createUtils();
    let fired = false;
    setTimeout(() => {
      fired = true;
    }, 50);

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(fired).toBe(true);
  });
});

describe('throttleLatest', () => {
  let utils: ReturnType<typeof createUtils>;

  beforeEach(() => {
    utils = createUtils();
  });

  it('fires immediately on first call', () => {
    const calls: string[] = [];
    const fn = utils.utils.throttleLatest(
      (v: unknown) => calls.push(v as string), 100,
    );

    fn('a');
    expect(calls).toEqual(['a']);
  });

  it('suppresses calls within the throttle window', () => {
    const calls: string[] = [];
    const fn = utils.utils.throttleLatest(
      (v: unknown) => calls.push(v as string), 100,
    );

    fn('a');
    fn('b');
    fn('c');

    expect(calls).toEqual(['a']);
  });

  it('fires the latest value after the throttle window', async () => {
    const calls: string[] = [];
    const fn = utils.utils.throttleLatest(
      (v: unknown) => calls.push(v as string), 50,
    );

    fn('a');
    fn('b');
    fn('c');

    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toEqual(['a', 'c']);
  });

  it('fires immediately again after the throttle window expires', async () => {
    const calls: string[] = [];
    const fn = utils.utils.throttleLatest(
      (v: unknown) => calls.push(v as string), 50,
    );

    fn('a');
    await new Promise((r) => setTimeout(r, 100));

    fn('b');
    expect(calls).toEqual(['a', 'b']);
  });

  it('does not fire deferred callback after clearAllTimers', async () => {
    const calls: string[] = [];
    const fn = utils.utils.throttleLatest(
      (v: unknown) => calls.push(v as string), 50,
    );

    fn('a');
    fn('b');

    utils.clearAllTimers();

    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toEqual(['a']);
  });

  it('passes all arguments to the callback', () => {
    const calls: unknown[][] = [];
    const fn = utils.utils.throttleLatest(
      (...args: unknown[]) => calls.push(args), 100,
    );

    fn(1, 2, 3);
    expect(calls).toEqual([[1, 2, 3]]);
  });

  it('deferred call uses the latest arguments', async () => {
    const calls: unknown[][] = [];
    const fn = utils.utils.throttleLatest(
      (...args: unknown[]) => calls.push(args), 50,
    );

    fn('x', 1);
    fn('y', 2);
    fn('z', 3);

    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toEqual([['x', 1], ['z', 3]]);
  });
});

describe('async chain cancellation', () => {
  it('stops an async chain mid-execution', async () => {
    const { utils: u, clearAllTimers } = createUtils();
    const steps: string[] = [];

    void (async () => {
      steps.push('before-sleep-1');
      await u.sleep(30);
      steps.push('after-sleep-1');
      await u.sleep(30);
      steps.push('after-sleep-2');
    })();

    await new Promise((r) => setTimeout(r, 10));
    expect(steps).toEqual(['before-sleep-1']);

    clearAllTimers();

    await new Promise((r) => setTimeout(r, 200));
    expect(steps).toEqual(['before-sleep-1']);
  });
});

describe('math utilities', () => {
  it('scaleLinear maps values correctly', () => {
    const { utils: u } = createUtils();
    const scale = u.scaleLinear(0, 100, 0, 255);
    expect(scale(0)).toBe(0);
    expect(scale(100)).toBe(255);
    expect(scale(50)).toBeCloseTo(127.5);
  });

  it('randomInt returns value in range', () => {
    const { utils: u } = createUtils();

    for (let i = 0; i < 100; i++) {
      const val = u.randomInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('randomInt with single arg returns 0 to n', () => {
    const { utils: u } = createUtils();

    for (let i = 0; i < 100; i++) {
      const val = u.randomInt(5);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(5);
    }
  });

  it('randomElement picks from array', () => {
    const { utils: u } = createUtils();
    const arr = ['a', 'b', 'c'];

    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(u.randomElement(arr));
    }
  });

  it('hslToRgb converts correctly', () => {
    const { utils: u } = createUtils();
    expect(u.hslToRgb(0, 1, 0.5)).toBe('#FF0000');
    expect(u.hslToRgb(120, 1, 0.5)).toBe('#00FF00');
    expect(u.hslToRgb(240, 1, 0.5)).toBe('#0000FF');
  });
});

describe('formatting utilities', () => {
  it('formatNumber adds thousands separators', () => {
    const { utils: u } = createUtils();
    expect(u.formatNumber(1000)).toBe('1,000');
    expect(u.formatNumber('99850')).toBe('99,850');
  });

  it('pick returns correct count of items', () => {
    const { utils: u } = createUtils();
    const arr = [1, 2, 3, 4, 5];
    const result = u.pick(arr, 3);
    expect(result).toHaveLength(3);

    for (const item of result) {
      expect(arr).toContain(item);
    }
  });

  it('pick does not exceed array length', () => {
    const { utils: u } = createUtils();
    const arr = [1, 2];
    const result = u.pick(arr, 5);
    expect(result).toHaveLength(2);
  });
});

describe('exclusive', () => {
  it('cancels previous invocation when called again', async () => {
    const { utils: u } = createUtils();
    const steps: string[] = [];

    const fn = u.exclusive(async (cancelled) => {
      steps.push('start');
      await u.sleep(50);

      if (cancelled()) {
        return;
      }

      steps.push('end');
    });

    void fn();
    await u.sleep(10);
    void fn();

    await new Promise((r) => setTimeout(r, 200));
    expect(steps).toEqual(['start', 'start', 'end']);
  });
});

describe('debounce', () => {
  it('fires on first call then suppresses within cooldown', async () => {
    const { utils: u, clearAllTimers } = createUtils();
    const calls: string[] = [];

    const fn = u.debounce((v: unknown) => calls.push(v as string), 100);

    fn('a');
    fn('b');
    fn('c');

    expect(calls).toEqual(['a']);

    await new Promise((r) => setTimeout(r, 150));
    fn('d');
    expect(calls).toEqual(['a', 'd']);
    clearAllTimers();
  });
});
