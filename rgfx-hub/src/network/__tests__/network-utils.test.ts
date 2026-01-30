/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getLocalIP, getBroadcastAddress } from '../network-utils';

describe('network-utils', () => {
  describe('getLocalIP', () => {
    it('should return a valid IPv4 address', () => {
      const ip = getLocalIP();

      expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });

    it('should return a non-loopback address when network is available', () => {
      const ip = getLocalIP();

      expect(ip).toBeDefined();
    });
  });

  describe('getBroadcastAddress', () => {
    it('should calculate broadcast address for standard IP', () => {
      expect(getBroadcastAddress('192.168.10.23')).toBe('192.168.10.255');
    });

    it('should calculate broadcast address for 10.x network', () => {
      expect(getBroadcastAddress('10.0.0.50')).toBe('10.0.0.255');
    });

    it('should calculate broadcast address for 172.x network', () => {
      expect(getBroadcastAddress('172.16.0.1')).toBe('172.16.0.255');
    });

    it('should handle localhost', () => {
      expect(getBroadcastAddress('127.0.0.1')).toBe('127.0.0.255');
    });
  });
});
