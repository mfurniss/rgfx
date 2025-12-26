/**
 * Test utilities for UDP socket mocking
 *
 * Provides separate tracking for driver sends vs localhost sends,
 * so tests can verify driver behavior without coupling to internal
 * implementation details like localhost mirroring for led-sim.
 */

import { vi } from 'vitest';

interface UdpMockCall {
  buffer: Buffer;
  port: number;
  ip: string;
}

interface UdpMockCalls {
  /** Calls to driver IPs (not localhost) */
  driverCalls: UdpMockCall[];
  /** Calls to localhost only */
  localhostCalls: { buffer: Buffer; port: number }[];
  /** All calls (for backward compatibility if needed) */
  allCalls: UdpMockCall[];
}

interface UdpSocketMock {
  mockSocketSend: ReturnType<typeof vi.fn>;
  mockSocketClose: ReturnType<typeof vi.fn>;
  mockSocketOn: ReturnType<typeof vi.fn>;
  calls: UdpMockCalls;
  reset: () => void;
  driverSendCount: number;
  localhostSendCount: number;
}

export function createUdpSocketMock(): UdpSocketMock {
  const calls: UdpMockCalls = {
    driverCalls: [],
    localhostCalls: [],
    allCalls: [],
  };

  const mockSocketSend = vi.fn(
    (
      buffer: Buffer,
      port: number,
      ip: string,
      callback: (err: Error | null) => void,
    ) => {
      calls.allCalls.push({ buffer, port, ip });

      if (ip === '127.0.0.1') {
        calls.localhostCalls.push({ buffer, port });
      } else {
        calls.driverCalls.push({ buffer, port, ip });
      }

      callback(null);
    },
  );

  const mockSocketClose = vi.fn();
  const mockSocketOn = vi.fn();

  const reset = () => {
    calls.driverCalls = [];
    calls.localhostCalls = [];
    calls.allCalls = [];
    mockSocketSend.mockClear();
    mockSocketClose.mockClear();
    mockSocketOn.mockClear();
  };

  return {
    mockSocketSend,
    mockSocketClose,
    mockSocketOn,
    calls,
    reset,
    get driverSendCount() {
      return calls.driverCalls.length;
    },
    get localhostSendCount() {
      return calls.localhostCalls.length;
    },
  };
}
