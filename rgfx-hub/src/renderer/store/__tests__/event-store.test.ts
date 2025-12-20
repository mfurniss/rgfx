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
    useEventStore.setState({ topics: new Map() });
  });

  describe('initial state', () => {
    it('should start with empty topics map', () => {
      const { topics } = useEventStore.getState();
      expect(topics.size).toBe(0);
    });
  });

  describe('onEventTopic', () => {
    it('should add a new topic', () => {
      const { onEventTopic } = useEventStore.getState();

      onEventTopic('game/score', 1, '1000');

      const { topics } = useEventStore.getState();
      expect(topics.size).toBe(1);
      expect(topics.get('game/score')).toEqual({
        topic: 'game/score',
        count: 1,
        lastValue: '1000',
      });
    });

    it('should update existing topic count', () => {
      const { onEventTopic } = useEventStore.getState();

      onEventTopic('game/score', 1, '1000');
      onEventTopic('game/score', 5, '5000');

      const { topics } = useEventStore.getState();
      expect(topics.size).toBe(1);
      expect(topics.get('game/score')).toEqual({
        topic: 'game/score',
        count: 5,
        lastValue: '5000',
      });
    });

    it('should track multiple topics independently', () => {
      const { onEventTopic } = useEventStore.getState();

      onEventTopic('game/score', 10, '10000');
      onEventTopic('game/lives', 3, '3');
      onEventTopic('game/level', 2, '2');

      const { topics } = useEventStore.getState();
      expect(topics.size).toBe(3);
      expect(topics.get('game/score')?.count).toBe(10);
      expect(topics.get('game/lives')?.count).toBe(3);
      expect(topics.get('game/level')?.count).toBe(2);
    });

    it('should handle topic without lastValue', () => {
      const { onEventTopic } = useEventStore.getState();

      onEventTopic('game/event', 1);

      const { topics } = useEventStore.getState();
      expect(topics.get('game/event')).toEqual({
        topic: 'game/event',
        count: 1,
        lastValue: undefined,
      });
    });

    it('should preserve immutability of topics map', () => {
      const { onEventTopic } = useEventStore.getState();
      onEventTopic('topic1', 1);

      const topicsBefore = useEventStore.getState().topics;
      onEventTopic('topic2', 1);
      const topicsAfter = useEventStore.getState().topics;

      // Maps should be different references
      expect(topicsBefore).not.toBe(topicsAfter);
    });
  });

  describe('reset', () => {
    it('should clear all topics', () => {
      const { onEventTopic, reset } = useEventStore.getState();

      // Add some topics
      onEventTopic('game/score', 10, '10000');
      onEventTopic('game/lives', 3, '3');
      onEventTopic('game/level', 2, '2');

      expect(useEventStore.getState().topics.size).toBe(3);

      // Reset
      reset();

      expect(useEventStore.getState().topics.size).toBe(0);
    });

    it('should return empty map after reset', () => {
      const { onEventTopic, reset } = useEventStore.getState();

      onEventTopic('game/score', 1, '100');
      reset();

      const { topics } = useEventStore.getState();
      expect(topics).toBeInstanceOf(Map);
      expect(topics.size).toBe(0);
    });

    it('should allow adding topics after reset', () => {
      const { onEventTopic, reset } = useEventStore.getState();

      onEventTopic('old/topic', 5, 'old');
      reset();
      onEventTopic('new/topic', 1, 'new');

      const { topics } = useEventStore.getState();
      expect(topics.size).toBe(1);
      expect(topics.get('new/topic')).toEqual({
        topic: 'new/topic',
        count: 1,
        lastValue: 'new',
      });
    });
  });
});
