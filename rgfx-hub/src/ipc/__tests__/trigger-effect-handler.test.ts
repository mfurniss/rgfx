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

  it('should register handler for effect:trigger channel', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('effect:trigger', expect.any(Function));
  });

  it('should pass payload directly to udpClient.broadcast', () => {
    const payload: EffectPayload = {
      effect: 'pulse',
      props: { color: '#FF0000', duration: 500 },
    };

    registeredHandler({}, payload);

    // Verify exact same object reference passed through (no modification)
    expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    expect(mockUdpClient.broadcast.mock.calls[0][0]).toBe(payload);
  });

  it('should propagate broadcast errors', () => {
    const error = new Error('UDP broadcast failed');
    mockUdpClient.broadcast.mockImplementation(() => {
      throw error;
    });

    const payload: EffectPayload = { effect: 'pulse', props: {} };

    expect(() => {
      registeredHandler({}, payload);
    }).toThrow(error);
  });
});
