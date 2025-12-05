/**
 * Unit tests for UdpClientImpl
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UdpClientImpl } from '../udp-client';
import { DriverRegistry } from '@/driver-registry';
import { Driver } from '@/types';
import type { EffectPayload } from '@/types/transformer-types';

// Create mock socket
const mockSocketSend = vi.fn(
  (
    _buffer: Buffer,
    _port: number,
    _ip: string,
    callback: (err: Error | null) => void,
  ) => {
    callback(null);
  },
);
const mockSocketClose = vi.fn();
const mockSocketOn = vi.fn();

// Mock dgram module
vi.mock('dgram', () => ({
  default: {
    createSocket: vi.fn(() => ({
      send: mockSocketSend,
      close: mockSocketClose,
      on: mockSocketOn,
    })),
  },
}));

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
    (driverRegistry as unknown as { drivers: Map<string, Driver> }).drivers.set(
      driver1.id,
      driver1,
    );
    (driverRegistry as unknown as { drivers: Map<string, Driver> }).drivers.set(
      driver2.id,
      driver2,
    );
    (driverRegistry as unknown as { drivers: Map<string, Driver> }).drivers.set(
      driver3.id,
      driver3,
    );
    (driverRegistry as unknown as { drivers: Map<string, Driver> }).drivers.set(
      driver4.id,
      driver4,
    );

    udpClient = new UdpClientImpl(driverRegistry);

    // Clear mock call history after creating udpClient
    mockSocketSend.mockClear();
    mockSocketClose.mockClear();
    mockSocketOn.mockClear();
  });

  afterEach(() => {
    udpClient.stop();
  });

  describe('broadcast', () => {
    it('should send to all connected drivers with IPs', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 1000,
      };

      udpClient.broadcast(payload);

      // Should send to driver-0001 and driver-0002 only (connected with IPs)
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should send correct JSON payload', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 1000,
      };

      udpClient.broadcast(payload);

      // Verify the buffer contains correct JSON
      const sentBuffer = mockSocketSend.mock.calls[0][0];
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).toEqual({ effect: 'score', value: 1000 });
    });

    it('should send to correct IP and port', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // Check first call (driver-0001)
      expect(mockSocketSend.mock.calls[0][1]).toBe(8888); // UDP_PORT
      expect(mockSocketSend.mock.calls[0][2]).toBe('192.168.1.101');

      // Check second call (driver-0002)
      expect(mockSocketSend.mock.calls[1][1]).toBe(8888);
      expect(mockSocketSend.mock.calls[1][2]).toBe('192.168.1.102');
    });

    it('should skip disconnected drivers', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0003 is disconnected, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should skip drivers without IP addresses', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0004 has no IP, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should handle empty driver list', () => {
      // Create empty registry
      const emptyRegistry = new DriverRegistry();
      const emptyClient = new UdpClientImpl(emptyRegistry);

      const payload: EffectPayload = { effect: 'test' };

      expect(() => {
        emptyClient.broadcast(payload);
      }).not.toThrow();

      // No UDP sends should occur (clear was called before this test)
      // We need to account for sends before clearing
      mockSocketSend.mockClear();
      emptyClient.broadcast(payload);
      expect(mockSocketSend).not.toHaveBeenCalled();

      emptyClient.stop();
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
      expect(mockSocketSend).toHaveBeenCalledTimes(1);
      expect(mockSocketSend.mock.calls[0][2]).toBe('192.168.1.101');
    });

    it('should send to multiple specified drivers', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0002'],
      };

      udpClient.broadcast(payload);

      // Should send to both driver-0001 and driver-0002
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should send to all drivers when drivers array is empty', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: [], // Empty array should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should send to all drivers when drivers property is undefined', () => {
      const payload: EffectPayload = {
        effect: 'test',
        // No drivers property - should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });

    it('should not send to any driver when no drivers match', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-9999'], // Non-existent driver
      };

      udpClient.broadcast(payload);

      // No sends should occur
      expect(mockSocketSend).not.toHaveBeenCalled();
    });

    it('should remove drivers property from UDP payload', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001'], // This should be removed from UDP packet
        value: 100,
      };

      udpClient.broadcast(payload);

      // Verify the buffer doesn't contain drivers property
      const sentBuffer = mockSocketSend.mock.calls[0][0];
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).not.toHaveProperty('drivers');
      expect(sentData).toHaveProperty('effect', 'test');
      expect(sentData).toHaveProperty('value', 100);
    });

    it('should skip disconnected drivers even when specified', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0003'], // 0003 is disconnected
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001 (0003 is disconnected)
      expect(mockSocketSend).toHaveBeenCalledTimes(1);
    });

    it('should skip drivers without IP even when specified', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0004'], // 0004 has no IP
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001 (0004 has no IP)
      expect(mockSocketSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('effect payload structure', () => {
    it('should handle simple effect payloads', () => {
      const payload: EffectPayload = { effect: 'generic' };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();

      const sentBuffer = mockSocketSend.mock.calls[0][0];
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).toEqual({ effect: 'generic' });
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

      const sentBuffer = mockSocketSend.mock.calls[0][0];
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).toEqual({
        effect: 'ghost_vulnerable',
        ghost: 'red',
        color: '#0000FF',
        speed: 200,
        duration: 5000,
      });
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

      const sentBuffer = mockSocketSend.mock.calls[0][0];
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).toEqual({
        effect: 'score',
        value: 12450,
        player: 'p1',
        multiplier: 2,
        combo: true,
      });
    });
  });

  describe('stop', () => {
    it('should close the socket', () => {
      udpClient.stop();

      expect(mockSocketClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('socket reuse', () => {
    it('should reuse the same socket for multiple broadcasts', async () => {
      const dgram = await import('dgram');

      // Clear any previous calls
      (dgram.default.createSocket as ReturnType<typeof vi.fn>).mockClear();

      // Create a new client
      const client = new UdpClientImpl(driverRegistry);

      // Socket created once in constructor
      expect(dgram.default.createSocket).toHaveBeenCalledTimes(1);

      // Multiple broadcasts
      client.broadcast({ effect: 'test1' });
      client.broadcast({ effect: 'test2' });
      client.broadcast({ effect: 'test3' });

      // Still only one socket created
      expect(dgram.default.createSocket).toHaveBeenCalledTimes(1);

      client.stop();
    });
  });
});
