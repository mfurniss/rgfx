/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearEffectsOnAllDrivers } from '../shutdown';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import type { Driver } from '../types';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('clearEffectsOnAllDrivers', () => {
  let mockDriverRegistry: {
    getConnectedDrivers: ReturnType<typeof vi.fn>;
  };
  let mockMqtt: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriverRegistry = {
      getConnectedDrivers: vi.fn(),
    };

    mockMqtt = {
      publish: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('sends clear-effects to all connected drivers', async () => {
    const drivers: Partial<Driver>[] = [
      { id: 'driver-001', mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'driver-002', mac: 'AA:BB:CC:DD:EE:02' },
      { id: 'driver-003', mac: 'AA:BB:CC:DD:EE:03' },
    ];
    mockDriverRegistry.getConnectedDrivers.mockReturnValue(drivers);

    await clearEffectsOnAllDrivers(
      mockDriverRegistry as unknown as DriverRegistry,
      mockMqtt as unknown as MqttBroker,
    );

    expect(mockMqtt.publish).toHaveBeenCalledTimes(3);
    expect(mockMqtt.publish).toHaveBeenCalledWith(
      'rgfx/driver/driver-001/clear-effects',
      '',
    );
    expect(mockMqtt.publish).toHaveBeenCalledWith(
      'rgfx/driver/driver-002/clear-effects',
      '',
    );
    expect(mockMqtt.publish).toHaveBeenCalledWith(
      'rgfx/driver/driver-003/clear-effects',
      '',
    );
  });

  it('does nothing when no drivers are connected', async () => {
    mockDriverRegistry.getConnectedDrivers.mockReturnValue([]);

    await clearEffectsOnAllDrivers(
      mockDriverRegistry as unknown as DriverRegistry,
      mockMqtt as unknown as MqttBroker,
    );

    expect(mockMqtt.publish).not.toHaveBeenCalled();
  });

  it('sends clear-effects to single connected driver', async () => {
    const drivers: Partial<Driver>[] = [
      { id: 'solo-driver', mac: 'AA:BB:CC:DD:EE:FF' },
    ];
    mockDriverRegistry.getConnectedDrivers.mockReturnValue(drivers);

    await clearEffectsOnAllDrivers(
      mockDriverRegistry as unknown as DriverRegistry,
      mockMqtt as unknown as MqttBroker,
    );

    expect(mockMqtt.publish).toHaveBeenCalledTimes(1);
    expect(mockMqtt.publish).toHaveBeenCalledWith(
      'rgfx/driver/solo-driver/clear-effects',
      '',
    );
  });

  it('waits for all publish promises to resolve', async () => {
    const drivers: Partial<Driver>[] = [
      { id: 'driver-001', mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'driver-002', mac: 'AA:BB:CC:DD:EE:02' },
    ];
    mockDriverRegistry.getConnectedDrivers.mockReturnValue(drivers);

    let resolveFirst: () => void;
    let resolveSecond: () => void;
    const firstPromise = new Promise<void>((r) => (resolveFirst = r));
    const secondPromise = new Promise<void>((r) => (resolveSecond = r));

    mockMqtt.publish
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    let resolved = false;
    const clearPromise = clearEffectsOnAllDrivers(
      mockDriverRegistry as unknown as DriverRegistry,
      mockMqtt as unknown as MqttBroker,
    ).then(() => {
      resolved = true;
    });

    // Not resolved yet
    await Promise.resolve();
    expect(resolved).toBe(false);

    // Resolve first, still not done
    resolveFirst!();
    await Promise.resolve();
    expect(resolved).toBe(false);

    // Resolve second, now done
    resolveSecond!();
    await clearPromise;
    expect(resolved).toBe(true);
  });
});
