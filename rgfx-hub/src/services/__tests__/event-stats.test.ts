import { describe, it, expect } from 'vitest';
import { createEventStats } from '../event-stats';

describe('createEventStats', () => {
  it('starts with count of 0', () => {
    const stats = createEventStats();
    expect(stats.getCount()).toBe(0);
  });

  it('increments count by 1', () => {
    const stats = createEventStats();
    stats.increment();
    expect(stats.getCount()).toBe(1);
  });

  it('accumulates multiple increments', () => {
    const stats = createEventStats();
    stats.increment();
    stats.increment();
    stats.increment();
    expect(stats.getCount()).toBe(3);
  });

  it('resets count to 0', () => {
    const stats = createEventStats();
    stats.increment();
    stats.increment();
    stats.reset();
    expect(stats.getCount()).toBe(0);
  });

  it('can increment again after reset', () => {
    const stats = createEventStats();
    stats.increment();
    stats.reset();
    stats.increment();
    expect(stats.getCount()).toBe(1);
  });

  it('creates independent instances', () => {
    const stats1 = createEventStats();
    const stats2 = createEventStats();

    stats1.increment();
    stats1.increment();
    stats2.increment();

    expect(stats1.getCount()).toBe(2);
    expect(stats2.getCount()).toBe(1);
  });
});
