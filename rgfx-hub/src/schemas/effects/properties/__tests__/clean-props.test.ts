import { describe, it, expect } from 'vitest';
import { removeDefaultNoOps, createNoOpCleaner } from '../clean-props';

describe('removeDefaultNoOps', () => {
  it('should remove props matching no-op values', () => {
    const result = removeDefaultNoOps(
      { reset: false, gravity: 0, color: '#FF0000' },
      { reset: false, gravity: 0 },
    );

    expect(result).toEqual({ color: '#FF0000' });
  });

  it('should preserve props that differ from no-op values', () => {
    const result = removeDefaultNoOps(
      { reset: true, gravity: 200, hueSpread: 0 },
      { reset: false, gravity: 0, hueSpread: 0 },
    );

    expect(result).toEqual({ reset: true, gravity: 200 });
  });

  it('should handle null no-op values', () => {
    const result = removeDefaultNoOps(
      { accentColor: null, text: 'hi' },
      { accentColor: null },
    );

    expect(result).toEqual({ text: 'hi' });
  });

  it('should not remove null when value is a string', () => {
    const result = removeDefaultNoOps(
      { accentColor: '#333333' },
      { accentColor: null },
    );

    expect(result).toEqual({ accentColor: '#333333' });
  });

  it('should handle true as a no-op value (scroll_text reset)', () => {
    const result = removeDefaultNoOps(
      { reset: true, text: 'hello' },
      { reset: true },
    );

    expect(result).toEqual({ text: 'hello' });
  });

  it('should not mutate the input props', () => {
    const input = { reset: false, color: '#FF0000' };
    removeDefaultNoOps(input, { reset: false });

    expect(input).toEqual({ reset: false, color: '#FF0000' });
  });

  it('should return all props when noOps is empty', () => {
    const result = removeDefaultNoOps({ a: 1, b: 2 }, {});

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should return empty object when all props match no-ops', () => {
    const result = removeDefaultNoOps(
      { reset: false, gravity: 0 },
      { reset: false, gravity: 0 },
    );

    expect(result).toEqual({});
  });
});

describe('createNoOpCleaner', () => {
  it('should return a function that removes no-op props', () => {
    const cleaner = createNoOpCleaner({ reset: false, gravity: 0 });
    const result = cleaner({ reset: false, gravity: 0, color: '#FF0000' });

    expect(result).toEqual({ color: '#FF0000' });
  });

  it('should be reusable across multiple calls', () => {
    const cleaner = createNoOpCleaner({ reset: false });

    expect(cleaner({ reset: false, a: 1 })).toEqual({ a: 1 });
    expect(cleaner({ reset: true, a: 1 })).toEqual({ reset: true, a: 1 });
  });
});
