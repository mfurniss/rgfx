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

  describe('onEvent', () => {
    it('should create new topic with count 1 on first event', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toEqual({ count: 1, lastValue: '1000' });
    });

    it('should increment count on subsequent events', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/score', '2000');
      onEvent('game/score', '3000');

      const { topics } = useEventStore.getState();
      expect(topics['game/score']?.count).toBe(3);
    });

    it('should update lastValue on each event', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      expect(useEventStore.getState().topics['game/score']?.lastValue).toBe('1000');

      onEvent('game/score', '2000');
      expect(useEventStore.getState().topics['game/score']?.lastValue).toBe('2000');
    });

    it('should handle multiple topics independently', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/lives', '3');
      onEvent('game/score', '2000');

      const { topics } = useEventStore.getState();
      expect(topics['game/score']).toEqual({ count: 2, lastValue: '2000' });
      expect(topics['game/lives']).toEqual({ count: 1, lastValue: '3' });
    });

    it('should handle undefined payload', () => {
      const { onEvent } = useEventStore.getState();

      onEvent('game/event');

      const { topics } = useEventStore.getState();
      expect(topics['game/event']).toEqual({ count: 1, lastValue: undefined });
    });
  });

  describe('reset', () => {
    it('should clear all topics', () => {
      const { onEvent, reset } = useEventStore.getState();

      onEvent('game/score', '1000');
      onEvent('game/lives', '3');
      onEvent('game/level', '1');
      expect(Object.keys(useEventStore.getState().topics).length).toBe(3);

      reset();

      expect(Object.keys(useEventStore.getState().topics).length).toBe(0);
    });

    it('should return empty object after reset', () => {
      const { onEvent, reset } = useEventStore.getState();

      onEvent('game/score', '1000');
      reset();

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({});
    });

    it('should allow receiving events after reset', () => {
      const { onEvent, reset } = useEventStore.getState();

      onEvent('old/topic', '5');
      reset();
      onEvent('new/topic', '1');

      const { topics } = useEventStore.getState();
      expect(topics).toEqual({ 'new/topic': { count: 1, lastValue: '1' } });
    });
  });
});
