/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../event-bus';

describe('eventBus', () => {
  describe('emit and on', () => {
    it('should deliver event to registered handler', () => {
      const handler = vi.fn();

      eventBus.on('network:error', handler);
      eventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(handler).toHaveBeenCalledWith({ code: 'ENETUNREACH' });

      eventBus.off('network:error', handler);
    });

    it('should deliver event to multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('network:error', handler1);
      eventBus.on('network:error', handler2);
      eventBus.emit('network:error', { code: 'ECONNREFUSED' });

      expect(handler1).toHaveBeenCalledWith({ code: 'ECONNREFUSED' });
      expect(handler2).toHaveBeenCalledWith({ code: 'ECONNREFUSED' });

      eventBus.off('network:error', handler1);
      eventBus.off('network:error', handler2);
    });

    it('should handle multiple emissions', () => {
      const handler = vi.fn();

      eventBus.on('network:error', handler);
      eventBus.emit('network:error', { code: 'ENETUNREACH' });
      eventBus.emit('network:error', { code: 'ECONNREFUSED' });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, { code: 'ENETUNREACH' });
      expect(handler).toHaveBeenNthCalledWith(2, { code: 'ECONNREFUSED' });

      eventBus.off('network:error', handler);
    });
  });

  describe('off', () => {
    it('should unregister handler', () => {
      const handler = vi.fn();

      eventBus.on('network:error', handler);
      eventBus.off('network:error', handler);
      eventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unregister the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('network:error', handler1);
      eventBus.on('network:error', handler2);
      eventBus.off('network:error', handler1);
      eventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith({ code: 'ENETUNREACH' });

      eventBus.off('network:error', handler2);
    });
  });
});
