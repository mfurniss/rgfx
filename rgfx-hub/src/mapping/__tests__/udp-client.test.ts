/**
 * Unit tests for UdpClientImpl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UdpClientImpl } from '../udp-client';
import { DriverRegistry } from '../../driver-registry';
import { Driver } from '../../types';
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
  let driverRegistry: DriverRegistry;
  let udpClient: UdpClientImpl;

  beforeEach(() => {
    // Create real DriverRegistry (no persistence needed for tests)
    driverRegistry = new DriverRegistry();

    // Register test drivers
    const driver1 = new Driver({
      id: 'rgfx-driver-0001',
      ip: '192.168.1.101',
      connected: true,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    });

    const driver2 = new Driver({
      id: 'rgfx-driver-0002',
      ip: '192.168.1.102',
      connected: true,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    });

    const driver3 = new Driver({
      id: 'rgfx-driver-0003',
      ip: '192.168.1.103',
      connected: false,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    });

    const driver4 = new Driver({
      id: 'rgfx-driver-0004',
      ip: undefined, // No IP
      connected: true,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    });

    // Manually add drivers to registry (bypass registerDriver which requires telemetry)
    (driverRegistry as any).drivers.set(driver1.id, driver1);
    (driverRegistry as any).drivers.set(driver2.id, driver2);
    (driverRegistry as any).drivers.set(driver3.id, driver3);
    (driverRegistry as any).drivers.set(driver4.id, driver4);

    udpClient = new UdpClientImpl(driverRegistry);

    // Clear mock call history after creating udpClient
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
      };

      udpClient.broadcast(payload);

      // Should send to driver-0001 and driver-0002 only (connected with IPs)
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
      expect(mockUdpSend).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: 'score',
          value: 1000,
        })
      );
    });

    it('should skip disconnected drivers', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0003 is disconnected, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
    });

    it('should skip drivers without IP addresses', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0004 has no IP, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
    });

    it('should handle empty driver list', () => {
      // Create empty registry
      const emptyRegistry = new DriverRegistry();
      const emptyClient = new UdpClientImpl(emptyRegistry);

      const payload: EffectPayload = { effect: 'test' };

      expect(() => {
        emptyClient.broadcast(payload);
      }).not.toThrow();

      // No UDP sends should occur
      expect(mockUdpSend).not.toHaveBeenCalled();
    });
  });

  describe('broadcast with selective routing', () => {
    it('should send only to specified drivers', () => {
      const payload: EffectPayload = {
        effect: 'score',
        drivers: ['rgfx-driver-0001'],
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001
      expect(mockUdpSend).toHaveBeenCalledTimes(1);
      expect(mockUdpSend).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: 'score',
        })
      );
    });

    it('should send to multiple specified drivers', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0002'],
      };

      udpClient.broadcast(payload);

      // Should send to both driver-0001 and driver-0002
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
    });

    it('should send to all drivers when drivers array is empty', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: [], // Empty array should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
    });

    it('should send to all drivers when drivers property is undefined', () => {
      const payload: EffectPayload = {
        effect: 'test',
        // No drivers property - should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(mockUdpSend).toHaveBeenCalledTimes(2);
    });

    it('should not send to any driver when no drivers match', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-9999'], // Non-existent driver
      };

      udpClient.broadcast(payload);

      // No sends should occur
      expect(mockUdpSend).not.toHaveBeenCalled();
    });

    it('should remove drivers property from UDP payload', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001'], // This should be removed from UDP packet
        value: 100,
      };

      udpClient.broadcast(payload);

      // Verify mockUdpSend was called
      expect(mockUdpSend).toHaveBeenCalled();

      // Check that drivers property was removed
      const sentPayload = mockUdpSend.mock.calls[0][0];
      expect(sentPayload).not.toHaveProperty('drivers');
      expect(sentPayload).toHaveProperty('effect', 'test');
      expect(sentPayload).toHaveProperty('value', 100);
    });

    it('should skip disconnected drivers even when specified', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0003'], // 0003 is disconnected
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001 (0003 is disconnected)
      expect(mockUdpSend).toHaveBeenCalledTimes(1);
    });

    it('should skip drivers without IP even when specified', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0004'], // 0004 has no IP
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001 (0004 has no IP)
      expect(mockUdpSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('effect payload structure', () => {
    it('should handle simple effect payloads', () => {
      const payload: EffectPayload = { effect: 'generic' };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();

      expect(mockUdpSend).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: 'generic',
        })
      );
    });

    it('should handle complex effect payloads', () => {
      const payload: EffectPayload = {
        effect: 'ghost_vulnerable',
        ghost: 'red',
        color: '#0000FF',
        speed: 200,
        duration: 5000,
      };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();

      expect(mockUdpSend).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: 'ghost_vulnerable',
          ghost: 'red',
          color: '#0000FF',
          speed: 200,
          duration: 5000,
        })
      );
    });

    it('should handle payloads with additional properties', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 12450,
        player: 'p1',
        multiplier: 2,
        combo: true,
      };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();

      expect(mockUdpSend).toHaveBeenCalledWith(
        expect.objectContaining({
          effect: 'score',
          value: 12450,
          player: 'p1',
          multiplier: 2,
          combo: true,
        })
      );
    });
  });
});
