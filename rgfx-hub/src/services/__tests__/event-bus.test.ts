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

  describe('driver events', () => {
    it('should emit driver:connected event with driver payload', () => {
      const handler = vi.fn();
      const mockDriver = {
        id: 'driver-1',
        mac: '00:11:22:33:44:55',
        state: 'connected',
      };

      eventBus.on('driver:connected', handler);
      eventBus.emit('driver:connected', { driver: mockDriver as any });

      expect(handler).toHaveBeenCalledWith({ driver: mockDriver });

      eventBus.off('driver:connected', handler);
    });

    it('should emit driver:disconnected event with driver and reason', () => {
      const handler = vi.fn();
      const mockDriver = {
        id: 'driver-1',
        mac: '00:11:22:33:44:55',
        state: 'disconnected',
      };

      eventBus.on('driver:disconnected', handler);
      eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

      expect(handler).toHaveBeenCalledWith({ driver: mockDriver, reason: 'disconnected' });

      eventBus.off('driver:disconnected', handler);
    });

    it('should emit driver:disconnected with restarting reason', () => {
      const handler = vi.fn();
      const mockDriver = {
        id: 'driver-1',
        mac: '00:11:22:33:44:55',
        state: 'disconnected',
      };

      eventBus.on('driver:disconnected', handler);
      eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'restarting' });

      expect(handler).toHaveBeenCalledWith({ driver: mockDriver, reason: 'restarting' });

      eventBus.off('driver:disconnected', handler);
    });

    it('should emit driver:updated event with driver payload', () => {
      const handler = vi.fn();
      const mockDriver = {
        id: 'driver-1',
        mac: '00:11:22:33:44:55',
        state: 'connected',
        stats: { telemetryEventsReceived: 10 },
      };

      eventBus.on('driver:updated', handler);
      eventBus.emit('driver:updated', { driver: mockDriver as any });

      expect(handler).toHaveBeenCalledWith({ driver: mockDriver });

      eventBus.off('driver:updated', handler);
    });
  });
});
