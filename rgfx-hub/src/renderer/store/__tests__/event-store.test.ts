/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '../event-store';

describe('useEventStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useEventStore.setState({ topics: {} });
  });

  describe('initial state', () => {
    it('should start with empty topics object', () => {
      const { topics } = useEventStore.getState();
      expect(Object.keys(topics).length).toBe(0);
    });
  });

  describe('setTopics', () => {
    it('should set topics from Record', () => {
      const { setTopics } = useEventStore.getState();

      setTopics({
        'game/score': { count: 10, lastValue: '1000' },
        'game/lives': { count: 3, lastValue: '2' },
      });

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toEqual({ count: 10, lastValue: '1000' });
      expect(topics['game/lives']).toEqual({ count: 3, lastValue: '2' });
    });

    it('should replace all topics', () => {
      const { setTopics } = useEventStore.getState();

      setTopics({ 'old/topic': { count: 5 } });
      setTopics({ 'new/topic': { count: 1 } });

      const { topics } = useEventStore.getState();
      expect(topics['old/topic']).toBeUndefined();
      expect(topics['new/topic']).toEqual({ count: 1 });
    });

    it('should handle empty object', () => {
      const { setTopics } = useEventStore.getState();

      setTopics({ 'game/score': { count: 10 } });
      setTopics({});

      const { topics } = useEventStore.getState();
      expect(Object.keys(topics).length).toBe(0);
    });

    it('should preserve lastValue when provided', () => {
      const { setTopics } = useEventStore.getState();

      setTopics({ 'game/score': { count: 5, lastValue: '500' } });

      const { topics } = useEventStore.getState();
      expect(topics['game/score'].lastValue).toBe('500');
    });
  });

  describe('reset', () => {
    it('should clear all topics', () => {
      const { setTopics, reset } = useEventStore.getState();

      setTopics({
        'game/score': { count: 10 },
        'game/lives': { count: 3 },
        'game/level': { count: 2 },
      });
      expect(Object.keys(useEventStore.getState().topics).length).toBe(3);

      reset();

      expect(Object.keys(useEventStore.getState().topics).length).toBe(0);
    });

    it('should return empty object after reset', () => {
      const { setTopics, reset } = useEventStore.getState();

      setTopics({ 'game/score': { count: 100 } });
      reset();

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({});
    });

    it('should allow setting topics after reset', () => {
      const { setTopics, reset } = useEventStore.getState();

      setTopics({ 'old/topic': { count: 5 } });
      reset();
      setTopics({ 'new/topic': { count: 1 } });

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({ 'new/topic': { count: 1 } });
    });
  });
});
