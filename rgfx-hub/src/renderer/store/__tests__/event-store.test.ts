import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEventStore } from '../event-store';

describe('useEventStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEventStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Fire event(s) and flush the 250ms batch timer */
  function flushEvents() {
    vi.advanceTimersByTime(250);
  }

  describe('initial state', () => {
    it('should start with empty topics object', () => {
      const { topics } = useEventStore.getState();
      expect(Object.keys(topics).length).toBe(0);
    });
  });

  describe('onEvent', () => {
    it('should create new topic with count 1 after flush', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toEqual({ count: 1, lastValue: '1000' });
    });

    it('should not update state before flush', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toBeUndefined();
    });

    it('should batch multiple events into a single flush', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/score', '2000');
      onEvent('game/score', '3000');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics['game/score']?.count).toBe(3);
      expect(topics['game/score']?.lastValue).toBe('3000');
    });

    it('should accumulate counts across multiple flushes', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      flushEvents();

      onEvent('game/score', '2000');
      onEvent('game/score', '3000');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics['game/score']?.count).toBe(3);
      expect(topics['game/score']?.lastValue).toBe('3000');
    });

    it('should handle multiple topics independently', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/lives', '3');
      onEvent('game/score', '2000');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toEqual({ count: 2, lastValue: '2000' });
      expect(topics['game/lives']).toEqual({ count: 1, lastValue: '3' });
    });

    it('should handle undefined payload', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/event');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics['game/event']).toEqual({ count: 1, lastValue: undefined });
    });
  });

  describe('topic eviction', () => {
    it('should evict oldest topics when exceeding MAX_EVENT_TOPICS', () => {
      const { onEvent } = useEventStore.getState();

      // Fill to 500 topics
      for (let i = 0; i < 500; i++) {
        onEvent(`topic/${i}`, `value-${i}`);
      }
      flushEvents();

      expect(Object.keys(useEventStore.getState().topics).length).toBe(500);

      // Add one more — oldest should be evicted
      onEvent('topic/new', 'new-value');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(Object.keys(topics).length).toBe(500);
      expect(topics['topic/0']).toBeUndefined();
      expect(topics['topic/new']).toEqual({ count: 1, lastValue: 'new-value' });
    });
  });

  describe('reset', () => {
    it('should clear all topics', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/lives', '3');
      onEvent('game/level', '1');
      flushEvents();
      expect(Object.keys(useEventStore.getState().topics).length).toBe(3);

      useEventStore.getState().reset();

      expect(Object.keys(useEventStore.getState().topics).length).toBe(0);
    });

    it('should return empty object after reset', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      flushEvents();
      useEventStore.getState().reset();

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({});
    });

    it('should discard pending buffered events', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      // Reset before flush — buffered event should be discarded
      useEventStore.getState().reset();
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({});
    });

    it('should allow receiving events after reset', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('old/topic', '5');
      flushEvents();
      useEventStore.getState().reset();
      onEvent('new/topic', '1');
      flushEvents();

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({ 'new/topic': { count: 1, lastValue: '1' } });
    });
  });
});
