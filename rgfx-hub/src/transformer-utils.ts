/**
 * Transformer utility functions injected via TransformerContext.
 *
 * Factory function creates all utils with shared timer-tracking state.
 * clearAllTimers is returned separately for the engine to call on game exit.
 */

export interface TransformerUtils {
  sleep(ms: number): Promise<void>;
  trackedTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>;
  trackedInterval(fn: () => void, ms: number): ReturnType<typeof setInterval>;
  debounce<T extends (...args: unknown[]) => void>(
    fn: T, ms: number
  ): (...args: Parameters<T>) => void;
  throttleLatest<T extends (...args: unknown[]) => void>(
    fn: T, ms: number
  ): (...args: Parameters<T>) => void;
  exclusive<T extends unknown[]>(
    fn: (cancelled: () => boolean, ...args: T) => Promise<void>
  ): (...args: T) => Promise<void>;
  scaleLinear(
    domainMin: number, domainMax: number,
    rangeMin: number, rangeMax: number
  ): (value: number) => number;
  randomInt(a: number, b?: number): number;
  randomElement<T>(array: T[]): T;
  hslToRgb(h: number, s: number, l: number): string;
  formatNumber(value: number | string): string;
  pick<T>(array: T[], count: number): T[];
}

export function createTransformerUtils(): {
  utils: TransformerUtils;
  clearAllTimers: () => void;
} {
  const activeTimers = new Set<ReturnType<typeof setTimeout>>();
  const activeIntervals = new Set<ReturnType<typeof setInterval>>();

  function trackedTimeout(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      activeTimers.delete(id);
      fn();
    }, ms);
    activeTimers.add(id);
    return id;
  }

  function trackedInterval(fn: () => void, ms: number) {
    const id = setInterval(fn, ms);
    activeIntervals.add(id);
    return id;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      trackedTimeout(resolve, ms);
    });
  }

  function debounce<T extends (...args: unknown[]) => void>(
    fn: T, ms: number,
  ): (...args: Parameters<T>) => void {
    let ready = true;
    return (...args: Parameters<T>) => {
      if (!ready) {
        return;
      }

      ready = false;
      trackedTimeout(() => {
        ready = true;
      }, ms);
      fn(...args);
    };
  }

  function throttleLatest<T extends (...args: unknown[]) => void>(
    fn: T, ms: number,
  ): (...args: Parameters<T>) => void {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let latestArgs: Parameters<T> | null = null;
    let lastFired = 0;

    return (...args: Parameters<T>) => {
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fn(...latestArgs!);
        }, delay);
      }
    };
  }

  function exclusive<T extends unknown[]>(
    fn: (cancelled: () => boolean, ...args: T) => Promise<void>,
  ): (...args: T) => Promise<void> {
    let gen = 0;
    return (...args: T) => {
      const mine = ++gen;
      return fn(() => mine !== gen, ...args);
    };
  }

  function scaleLinear(
    domainMin: number, domainMax: number,
    rangeMin: number, rangeMax: number,
  ): (value: number) => number {
    return (value: number) => {
      const ratio = (value - domainMin) / (domainMax - domainMin);
      return rangeMin + ratio * (rangeMax - rangeMin);
    };
  }

  function randomInt(a: number, b?: number): number {
    if (b === undefined) {
      return Math.floor(Math.random() * (a + 1));
    }

    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  function hslToRgb(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r: number, g: number, b: number;

    if (h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (h < 180) {
      [r, g, b] = [0, c, x];
    } else if (h < 240) {
      [r, g, b] = [0, x, c];
    } else if (h < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    const toHex = (v: number) =>
      Math.round((v + m) * 255).toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function formatNumber(value: number | string): string {
    return Number(value).toLocaleString();
  }

  function pick<T>(array: T[], count: number): T[] {
    const n = Math.min(count, array.length);
    const copy = array.slice();

    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, n);
  }

  function clearAllTimers(): void {
    for (const id of activeTimers) {
      clearTimeout(id);
    }

    activeTimers.clear();

    for (const id of activeIntervals) {
      clearInterval(id);
    }

    activeIntervals.clear();
  }

  return {
    utils: {
      sleep,
      trackedTimeout,
      trackedInterval,
      debounce,
      throttleLatest,
      exclusive,
      scaleLinear,
      randomInt,
      randomElement,
      hslToRgb,
      formatNumber,
      pick,
    },
    clearAllTimers,
  };
}
