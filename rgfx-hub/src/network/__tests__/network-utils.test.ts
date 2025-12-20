/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Store the mock function in module scope, accessible from the factory
const { mockNetworkInterfaces } = vi.hoisted(() => ({
  mockNetworkInterfaces: vi.fn(),
}));

vi.mock('node:os', () => ({
  default: {
    networkInterfaces: mockNetworkInterfaces,
    platform: () => 'darwin',
    arch: () => 'arm64',
    homedir: () => '/Users/test',
  },
  networkInterfaces: mockNetworkInterfaces,
  platform: () => 'darwin',
  arch: () => 'arm64',
  homedir: () => '/Users/test',
}));

import { getLocalIP, getBroadcastAddress } from '../network-utils';
import type { NetworkInterfaceInfo } from 'node:os';

// Helper to create properly typed network interface entries
function createInterface(
  family: 'IPv4' | 'IPv6',
  address: string,
  internal: boolean,
): NetworkInterfaceInfo {
  if (family === 'IPv6') {
    return { family, address, internal, netmask: '', mac: '', cidr: null, scopeid: 0 };
  }
  return { family, address, internal, netmask: '', mac: '', cidr: null };
}

describe('network-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLocalIP', () => {
    it('should prefer WiFi/Ethernet interfaces (en0)', () => {
      mockNetworkInterfaces.mockReturnValue({
        lo0: [createInterface('IPv4', '127.0.0.1', true)],
        en0: [createInterface('IPv4', '192.168.1.100', false)],
        utun0: [createInterface('IPv4', '10.0.0.1', false)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('192.168.1.100');
    });

    it('should prefer eth0 over non-standard interfaces', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: [createInterface('IPv4', '10.0.0.50', false)],
        docker0: [createInterface('IPv4', '172.17.0.1', false)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('10.0.0.50');
    });

    it('should fall back to first candidate when no preferred interface exists', () => {
      mockNetworkInterfaces.mockReturnValue({
        docker0: [createInterface('IPv4', '172.17.0.1', false)],
        utun0: [createInterface('IPv4', '10.0.0.1', false)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('172.17.0.1');
    });

    it('should return 127.0.0.1 when no network interfaces found', () => {
      mockNetworkInterfaces.mockReturnValue({});

      const ip = getLocalIP();

      expect(ip).toBe('127.0.0.1');
    });

    it('should return 127.0.0.1 when only internal interfaces exist', () => {
      mockNetworkInterfaces.mockReturnValue({
        lo0: [createInterface('IPv4', '127.0.0.1', true)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('127.0.0.1');
    });

    it('should ignore IPv6 addresses', () => {
      mockNetworkInterfaces.mockReturnValue({
        en0: [
          createInterface('IPv6', 'fe80::1', false),
          createInterface('IPv4', '192.168.1.100', false),
        ],
      });

      const ip = getLocalIP();

      expect(ip).toBe('192.168.1.100');
    });

    it('should handle undefined interface arrays gracefully', () => {
      mockNetworkInterfaces.mockReturnValue({
        en0: undefined,
        eth0: [createInterface('IPv4', '10.0.0.1', false)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('10.0.0.1');
    });

    it('should select en1 when en0 has no IPv4 addresses', () => {
      mockNetworkInterfaces.mockReturnValue({
        en0: [createInterface('IPv6', 'fe80::1', false)],
        en1: [createInterface('IPv4', '192.168.1.200', false)],
      });

      const ip = getLocalIP();

      expect(ip).toBe('192.168.1.200');
    });
  });

  describe('getBroadcastAddress', () => {
    it('should calculate broadcast address for standard IP', () => {
      const broadcast = getBroadcastAddress('192.168.10.23');

      expect(broadcast).toBe('192.168.10.255');
    });

    it('should calculate broadcast address for 10.x network', () => {
      const broadcast = getBroadcastAddress('10.0.0.50');

      expect(broadcast).toBe('10.0.0.255');
    });

    it('should calculate broadcast address for 172.x network', () => {
      const broadcast = getBroadcastAddress('172.16.0.1');

      expect(broadcast).toBe('172.16.0.255');
    });

    it('should handle localhost', () => {
      const broadcast = getBroadcastAddress('127.0.0.1');

      expect(broadcast).toBe('127.0.0.255');
    });
  });
});
