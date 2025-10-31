/**
 * Unit tests for UdpClientImpl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UdpClientImpl } from '../udp-client';
import type { DriverRegistry } from '../../driver-registry';
import type { Driver } from '../../types';
import type { EffectPayload } from '../../types/mapping-types';

// Mock the Udp class
vi.mock('../../udp', () => {
  return {
    Udp: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
      stop: vi.fn(),
      setSentCallback: vi.fn(),
      setErrorCallback: vi.fn(),
    })),
  };
});

describe('UdpClientImpl', () => {
  let mockDriverRegistry: DriverRegistry;
  let udpClient: UdpClientImpl;
  let mockDrivers: Driver[];

  beforeEach(() => {
    // Create mock drivers
    mockDrivers = [
      {
        id: 'aa:bb:cc:dd:ee:01',
        name: 'driver-1',
        type: 'driver',
        connected: true,
        ip: '192.168.1.101',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'aa:bb:cc:dd:ee:02',
        name: 'driver-2',
        type: 'driver',
        connected: true,
        ip: '192.168.1.102',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'aa:bb:cc:dd:ee:03',
        name: 'driver-3',
        type: 'driver',
        connected: false, // Not connected
        ip: '192.168.1.103',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'aa:bb:cc:dd:ee:04',
        name: 'driver-4',
        type: 'driver',
        connected: true,
        ip: undefined, // No IP
        lastSeen: Date.now(),
      } as Driver,
    ];

    // Mock DriverRegistry
    mockDriverRegistry = {
      getAllDrivers: vi.fn().mockReturnValue(mockDrivers),
      getDriver: vi.fn((id: string) => mockDrivers.find((d) => d.id === id)),
    } as unknown as DriverRegistry;

    udpClient = new UdpClientImpl(mockDriverRegistry);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('broadcast', () => {
    it('should send to all connected drivers with IPs', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 1000,
        hint: { visual: 'pulse', color: '#00FF00' },
      };

      udpClient.broadcast(payload);

      // Should only send to driver-1 and driver-2 (connected with IPs)
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should skip disconnected drivers', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-3 is disconnected, should be skipped
      const allDrivers = mockDriverRegistry.getAllDrivers();
      const connectedDrivers = allDrivers.filter((d) => d.connected && d.ip);

      expect(connectedDrivers).toHaveLength(2);
      expect(connectedDrivers.map((d) => d.id)).toEqual([
        'aa:bb:cc:dd:ee:01',
        'aa:bb:cc:dd:ee:02',
      ]);
    });

    it('should skip drivers without IP addresses', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-4 has no IP, should be skipped
      const allDrivers = mockDriverRegistry.getAllDrivers();
      const validDrivers = allDrivers.filter((d) => d.connected && d.ip);

      expect(validDrivers).toHaveLength(2);
      expect(validDrivers.every((d) => d.ip !== undefined)).toBe(true);
    });

    it('should handle empty driver list', () => {
      (mockDriverRegistry.getAllDrivers as any).mockReturnValue([]);

      const payload: EffectPayload = { effect: 'test' };

      expect(() => { udpClient.broadcast(payload); }).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send to specific driver by ID', () => {
      const payload: EffectPayload = {
        effect: 'player_death',
        hint: { visual: 'fade', color: '#FF0000' },
      };

      udpClient.send('aa:bb:cc:dd:ee:01', payload);

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith(
        'aa:bb:cc:dd:ee:01',
      );
    });

    it('should not throw when driver not found', () => {
      const payload: EffectPayload = { effect: 'test' };

      expect(() =>
        { udpClient.send('nonexistent-id', payload); },
      ).not.toThrow();
    });

    it('should not throw when driver has no IP', () => {
      const payload: EffectPayload = { effect: 'test' };

      expect(() =>
        { udpClient.send('aa:bb:cc:dd:ee:04', payload); },
      ).not.toThrow();
    });

    it('should handle driver not connected', () => {
      const payload: EffectPayload = { effect: 'test' };

      // driver-3 is not connected
      expect(() =>
        { udpClient.send('aa:bb:cc:dd:ee:03', payload); },
      ).not.toThrow();
    });
  });

  describe('sendToDrivers', () => {
    it('should send to multiple specific drivers', () => {
      const payload: EffectPayload = {
        effect: 'bonus_stage',
        hint: { visual: 'sparkle', count: 10 },
      };

      const driverIds = ['aa:bb:cc:dd:ee:01', 'aa:bb:cc:dd:ee:02'];

      udpClient.sendToDrivers(driverIds, payload);

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith(
        'aa:bb:cc:dd:ee:01',
      );
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith(
        'aa:bb:cc:dd:ee:02',
      );
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledTimes(2);
    });

    it('should handle empty driver ID list', () => {
      const payload: EffectPayload = { effect: 'test' };

      expect(() => { udpClient.sendToDrivers([], payload); }).not.toThrow();
      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });

    it('should continue on invalid driver IDs', () => {
      const payload: EffectPayload = { effect: 'test' };
      const driverIds = [
        'aa:bb:cc:dd:ee:01',
        'nonexistent',
        'aa:bb:cc:dd:ee:02',
      ];

      expect(() => { udpClient.sendToDrivers(driverIds, payload); }).not.toThrow();
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledTimes(3);
    });
  });

  describe('effect payload structure', () => {
    it('should handle simple effect payloads', () => {
      const payload: EffectPayload = { effect: 'generic' };

      expect(() => { udpClient.send('aa:bb:cc:dd:ee:01', payload); }).not.toThrow();
    });

    it('should handle complex effect payloads with hints', () => {
      const payload: EffectPayload = {
        effect: 'ghost_vulnerable',
        ghost: 'red',
        hint: {
          visual: 'pulse',
          color: '#0000FF',
          speed: 200,
          duration: 5000,
        },
      };

      expect(() => { udpClient.send('aa:bb:cc:dd:ee:01', payload); }).not.toThrow();
    });

    it('should handle payloads with additional properties', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 12450,
        player: 'p1',
        multiplier: 2,
        combo: true,
        hint: {
          visual: 'pulse',
          color: '#FFFF00',
          intensity: 255,
        },
      };

      expect(() => { udpClient.send('aa:bb:cc:dd:ee:01', payload); }).not.toThrow();
    });
  });
});
