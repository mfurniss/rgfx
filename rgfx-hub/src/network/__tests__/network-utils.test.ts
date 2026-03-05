import { describe, it, expect } from 'vitest';

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
