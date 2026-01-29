/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { DiscoveryController } from '../network-manager.js';
import * as networkUtils from '../network-utils';

vi.mock('../network-utils', () => ({
  getLocalIP: vi.fn(),
}));

// Create a mock event bus for each test
const createMockEventBus = () => {
  const emitter = new EventEmitter();
  return {
    emit: (event: string, payload: unknown) => emitter.emit(event, payload),
    on: (event: string, handler: (payload: unknown) => void) => emitter.on(event, handler),
    off: (event: string, handler: (payload: unknown) => void) => emitter.off(event, handler),
  };
};

let mockEventBus: ReturnType<typeof createMockEventBus>;

vi.mock('@/services/event-bus', () => ({
  get eventBus() {
    return mockEventBus;
  },
}));

// Helper to flush pending promises - advances timers by 0ms to process queued microtasks
const flushPromises = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('NetworkManager', () => {
  let mockMqtt: DiscoveryController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();

    mockEventBus = createMockEventBus();

    mockMqtt = {
      stopDiscovery: vi.fn(),
      restartDiscovery: vi.fn(),
    };

    vi.mocked(networkUtils.getLocalIP).mockReturnValue('192.168.1.100');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('network:error event handling', () => {
    it('should stop discovery when ENETUNREACH error occurs', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(mockMqtt.stopDiscovery).toHaveBeenCalled();
      networkManager.stop();
    });

    it('should emit network:changed event when network becomes unreachable', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(emitSpy).toHaveBeenCalledWith('network:changed', undefined);
      networkManager.stop();
    });

    it('should ignore non-ENETUNREACH errors', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ECONNREFUSED' });

      expect(mockMqtt.stopDiscovery).not.toHaveBeenCalled();
      networkManager.stop();
    });

    it('should debounce multiple ENETUNREACH errors', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });
      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });
      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      expect(mockMqtt.stopDiscovery).toHaveBeenCalledTimes(1);
      networkManager.stop();
    });
  });

  describe('network recovery', () => {
    it('should restart discovery after 5 seconds when network recovers', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockMqtt.restartDiscovery).toHaveBeenCalledWith('192.168.1.100');
      networkManager.stop();
    });

    it('should emit network:changed when network recovers', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });
      emitSpy.mockClear();

      await vi.advanceTimersByTimeAsync(5000);

      expect(emitSpy).toHaveBeenCalledWith('network:changed', undefined);
      networkManager.stop();
    });

    it('should keep polling if network is still down', async () => {
      vi.mocked(networkUtils.getLocalIP).mockReturnValue('127.0.0.1');

      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      await vi.advanceTimersByTimeAsync(5000);
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();
      networkManager.stop();
    });

    it('should restart discovery when network eventually recovers', async () => {
      // Use mockImplementation to return different values on each call
      let callCount = 0;
      vi.mocked(networkUtils.getLocalIP).mockImplementation(() => {
        callCount++;

        // Call 1: constructor - has network
        if (callCount === 1) {
          return '192.168.1.100';
        }

        // Calls 2-3: network down (first two recovery checks)
        if (callCount <= 3) {
          return '127.0.0.1';
        }

        // Call 4+: network recovered
        return '192.168.1.100';
      });

      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      // First recovery check - still down
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();

      // Second recovery check - still down
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();

      // Third recovery check - recovered
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockMqtt.restartDiscovery).toHaveBeenCalledWith('192.168.1.100');
      networkManager.stop();
    });
  });

  describe('IP change detection', () => {
    it('should restart discovery when IP changes to different address', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      // IP changes after 5 seconds
      vi.mocked(networkUtils.getLocalIP).mockReturnValue('192.168.2.50');
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockMqtt.stopDiscovery).toHaveBeenCalled();
      expect(mockMqtt.restartDiscovery).toHaveBeenCalledWith('192.168.2.50');
      expect(emitSpy).toHaveBeenCalledWith('network:changed', undefined);
      networkManager.stop();
    });

    it('should handle IP changing to localhost (network down)', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      // IP changes to localhost (no network)
      vi.mocked(networkUtils.getLocalIP).mockReturnValue('127.0.0.1');
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockMqtt.stopDiscovery).toHaveBeenCalled();
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();
      networkManager.stop();
    });

    it('should not trigger if IP stays the same', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      // IP stays the same
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockMqtt.stopDiscovery).not.toHaveBeenCalled();
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();
      networkManager.stop();
    });

    it('should skip IP check while recovery is in progress', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      // Trigger network unreachable
      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });
      vi.mocked(mockMqtt.stopDiscovery).mockClear();

      // IP check runs but should be skipped during recovery
      vi.mocked(networkUtils.getLocalIP).mockReturnValue('192.168.2.50');
      await vi.advanceTimersByTimeAsync(2000); // Mid-recovery

      expect(mockMqtt.stopDiscovery).not.toHaveBeenCalled();
      networkManager.stop();
    });
  });

  describe('stop', () => {
    it('should clear pending recovery timer', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      mockEventBus.emit('network:error', { code: 'ENETUNREACH' });

      networkManager.stop();

      await vi.advanceTimersByTimeAsync(10000);
      expect(mockMqtt.restartDiscovery).not.toHaveBeenCalled();
    });

    it('should clear IP check interval', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      networkManager.stop();

      // IP changes but interval should be cleared
      vi.mocked(networkUtils.getLocalIP).mockReturnValue('192.168.2.50');
      await vi.advanceTimersByTimeAsync(10000);

      expect(mockMqtt.stopDiscovery).not.toHaveBeenCalled();
    });

    it('should handle stop when no timer is pending', async () => {
      const { NetworkManager } = await import('../network-manager.js');
      const networkManager = new NetworkManager(mockMqtt);
      await flushPromises();

      expect(() => {
        networkManager.stop();
      }).not.toThrow();
    });
  });
});
