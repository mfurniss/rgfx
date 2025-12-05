/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerTriggerEffectHandler } from '../trigger-effect-handler';
import type { UdpClient, EffectPayload } from '@/types/transformer-types';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('registerTriggerEffectHandler', () => {
  let mockUdpClient: {
    broadcast: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: (event: unknown, payload: EffectPayload) => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUdpClient = {
      broadcast: vi.fn(),
    };

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (event: unknown, payload: EffectPayload) => void) => {
        registeredHandler = handler;
      },
    );

    registerTriggerEffectHandler({
      udpClient: mockUdpClient as unknown as UdpClient,
    });
  });

  describe('handler registration', () => {
    it('should register handler for effect:trigger channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('effect:trigger', expect.any(Function));
    });
  });

  describe('effect broadcasting', () => {
    it('should broadcast pulse effect with props', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: {
          color: '#FF0000',
          duration: 500,
        },
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledWith(payload);
    });

    it('should broadcast wipe effect with props', () => {
      const payload: EffectPayload = {
        effect: 'wipe',
        props: {
          color: '#00FF00',
          direction: 'forward',
          duration: 1000,
        },
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledWith(payload);
    });

    it('should broadcast explode effect with props', () => {
      const payload: EffectPayload = {
        effect: 'explode',
        props: {
          color: '#0000FF',
          speed: 2,
        },
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledWith(payload);
    });

    it('should broadcast effect with minimal props', () => {
      const payload: EffectPayload = {
        effect: 'flash',
        props: {},
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledWith(payload);
    });

    it('should preserve all payload properties', () => {
      const payload: EffectPayload = {
        effect: 'custom',
        props: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          string: 'test',
          number: 42,
          boolean: true,
        },
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledWith(payload);
    });
  });

  describe('error handling', () => {
    it('should throw when broadcast fails', () => {
      const error = new Error('UDP broadcast failed');
      mockUdpClient.broadcast.mockImplementation(() => {
        throw error;
      });

      const payload: EffectPayload = {
        effect: 'pulse',
        props: {},
      };

      expect(() => {
        registeredHandler({}, payload);
      }).toThrow('UDP broadcast failed');
    });

    it('should propagate original error', () => {
      const originalError = new Error('Network unreachable');
      mockUdpClient.broadcast.mockImplementation(() => {
        throw originalError;
      });

      const payload: EffectPayload = {
        effect: 'pulse',
        props: {},
      };

      expect(() => {
        registeredHandler({}, payload);
      }).toThrow(originalError);
    });
  });

  describe('payload passthrough', () => {
    it('should pass payload directly without modification', () => {
      const payload: EffectPayload = {
        effect: 'test-effect',
        props: {
          someKey: 'someValue',
        },
      };

      registeredHandler({}, payload);

      const broadcastCall = mockUdpClient.broadcast.mock.calls[0][0];
      expect(broadcastCall).toBe(payload);
    });

    it('should broadcast exactly once per call', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: {},
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple sequential calls', () => {
      const payloads: EffectPayload[] = [
        { effect: 'pulse', props: { color: '#FF0000' } },
        { effect: 'wipe', props: { color: '#00FF00' } },
        { effect: 'explode', props: { color: '#0000FF' } },
      ];

      payloads.forEach((payload) => {
        registeredHandler({}, payload);
      });

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(3);
      expect(mockUdpClient.broadcast).toHaveBeenNthCalledWith(1, payloads[0]);
      expect(mockUdpClient.broadcast).toHaveBeenNthCalledWith(2, payloads[1]);
      expect(mockUdpClient.broadcast).toHaveBeenNthCalledWith(3, payloads[2]);
    });
  });
});
