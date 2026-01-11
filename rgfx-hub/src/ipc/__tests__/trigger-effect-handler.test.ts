/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerTriggerEffectHandler } from '../trigger-effect-handler';
import type { UdpClient, EffectPayload } from '@/types/transformer-types';
import type { DriverRegistry } from '@/driver-registry';

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
  let mockUdpClient: MockProxy<UdpClient>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let registeredHandler: (event: unknown, payload: EffectPayload) => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUdpClient = mock<UdpClient>();
    mockDriverRegistry = mock<DriverRegistry>();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (event: unknown, payload: EffectPayload) => void) => {
        registeredHandler = handler;
      },
    );

    registerTriggerEffectHandler({
      udpClient: mockUdpClient,
      driverRegistry: mockDriverRegistry,
    });
  });

  it('should register handler for effect:trigger channel', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('effect:trigger', expect.any(Function));
  });

  it('should pass validated payload with schema defaults to udpClient.broadcast', () => {
    const payload: EffectPayload = {
      effect: 'pulse',
      props: { color: '#FF0000', duration: 500 },
    };

    registeredHandler({}, payload);

    // Handler validates props and applies schema defaults
    expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    const broadcastPayload = mockUdpClient.broadcast.mock.calls[0][0];
    const props = broadcastPayload.props as Record<string, unknown>;
    expect(broadcastPayload.effect).toBe('pulse');
    expect(props.color).toBe('#FF0000');
    expect(props.duration).toBe(500);
    // Schema defaults are applied
    expect(props.reset).toBe(false);
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
