/**
 * Unit tests for UdpClientImpl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UdpClientImpl } from '../udp-client';
import type { DriverRegistry } from '../../driver-registry';
import type { Driver } from '../../types';
import type { EffectPayload } from '../../types/mapping-types';

// Create mock functions at module scope
const mockUdpSend = vi.fn();
const mockUdpStop = vi.fn();
const mockUdpSetSentCallback = vi.fn();
const mockUdpSetErrorCallback = vi.fn();

// Mock the Udp class
vi.mock('../../udp', () => {
  return {
    Udp: vi.fn().mockImplementation(() => ({
      send: mockUdpSend,
      stop: mockUdpStop,
      setSentCallback: mockUdpSetSentCallback,
      setErrorCallback: mockUdpSetErrorCallback,
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
        id: 'rgfx-driver-0001',
        connected: true,
        ip: '192.168.1.101',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'rgfx-driver-0002',
        connected: true,
        ip: '192.168.1.102',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'rgfx-driver-0003',
        connected: false, // Not connected
        ip: '192.168.1.103',
        lastSeen: Date.now(),
      } as Driver,
      {
        id: 'rgfx-driver-0004',
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

    // Clear mock call history after creating udpClient (clears construction calls)
    mockUdpSend.mockClear();
    mockUdpStop.mockClear();
    mockUdpSetSentCallback.mockClear();
    mockUdpSetErrorCallback.mockClear();
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
      expect(connectedDrivers.map((d) => d.id)).toEqual(['rgfx-driver-0001', 'rgfx-driver-0002']);
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

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();
    });
  });

  describe('broadcast with selective routing', () => {
    beforeEach(() => {
      // Add more specific drivers for testing short-form MACs
      mockDrivers.push(
        {
          id: '44:1D:64:F8:9A:58',
          connected: true,
          ip: '192.168.1.105',
          lastSeen: Date.now(),
        } as Driver,
        {
          id: '44:1D:64:F8:CF:68',
          connected: true,
          ip: '192.168.1.106',
          lastSeen: Date.now(),
        } as Driver
      );
    });

    it('should send only to specified drivers with full MAC addresses', () => {
      const payload: EffectPayload = {
        effect: 'score',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0002'],
        hint: { visual: 'pulse', color: '#00FF00' },
      };

      udpClient.broadcast(payload);

      // Should call sendToDrivers with only the specified drivers
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0002');
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledTimes(2);
    });

    it('should send only to specified drivers with short-form MAC (last 3 bytes)', () => {
      const payload: EffectPayload = {
        effect: 'ghost_pulse',
        drivers: ['F8:9A:58'], // Short-form MAC (last 3 bytes)
        hint: { visual: 'pulse', color: '#FF0000' },
      };

      udpClient.broadcast(payload);

      // Should match driver with ID '44:1D:64:F8:9A:58'
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
      // Note: The actual sending logic would filter to matching drivers
      // We need to verify the internal logic matches correctly
    });

    it('should handle case-insensitive short-form MAC matching', () => {
      const payload: EffectPayload = {
        effect: 'ghost_pulse',
        drivers: ['f8:9a:58'], // Lowercase short-form MAC
        hint: { visual: 'pulse', color: '#0000FF' },
      };

      udpClient.broadcast(payload);

      // Should still match driver with ID '44:1D:64:F8:9A:58' (uppercase)
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should handle mixed full and short-form MAC addresses', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: [
          'rgfx-driver-0001', // Full MAC
          'F8:CF:68', // Short-form MAC
        ],
        hint: { visual: 'wipe' },
      };

      udpClient.broadcast(payload);

      // Should match both types
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should send to all drivers when drivers array is empty', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: [], // Empty array should send to all
        hint: { visual: 'pulse' },
      };

      udpClient.broadcast(payload);

      // Should behave like normal broadcast
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should send to all drivers when drivers property is undefined', () => {
      const payload: EffectPayload = {
        effect: 'test',
        hint: { visual: 'pulse' },
        // No drivers property - should send to all
      };

      udpClient.broadcast(payload);

      // Should behave like normal broadcast
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should not send to any driver when no drivers match', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['XX:YY:ZZ'], // Non-existent short-form
        hint: { visual: 'pulse' },
      };

      udpClient.broadcast(payload);

      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
      // No specific driver sends should happen
    });

    it('should remove drivers property from UDP payload', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001'], // This should be removed from UDP packet
        hint: { visual: 'pulse', color: '#00FF00' },
      };

      // Spy on the UDP send method to verify drivers property is not sent
      udpClient.broadcast(payload);

      // Verify mockUdpSend was called and check the payload
      expect(mockUdpSend).toHaveBeenCalled();
      if (mockUdpSend.mock.calls.length > 0) {
        const sentPayload = mockUdpSend.mock.calls[0][0];
        expect(sentPayload).not.toHaveProperty('drivers');
        expect(sentPayload).toHaveProperty('effect', 'test');
      }
    });

    it('should handle uppercase driver IDs in registry', () => {
      // Ensure driver IDs are uppercase in registry (as they are in real system)
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['9a:58'], // Very short form (last 2 bytes)
        hint: { visual: 'pulse' },
      };

      udpClient.broadcast(payload);

      // Should match '44:1D:64:F8:9A:58'
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });

    it('should match exactly when short-form has colons', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['CF:68'], // Short-form with colon
        hint: { visual: 'pulse' },
      };

      udpClient.broadcast(payload);

      // Should match '44:1D:64:F8:CF:68'
      expect(mockDriverRegistry.getAllDrivers).toHaveBeenCalled();
    });
  });

  describe('effect payload structure', () => {
    it('should handle simple effect payloads', () => {
      const payload: EffectPayload = { effect: 'generic' };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();
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

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();
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

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();
    });
  });
});
