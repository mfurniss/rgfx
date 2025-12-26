/**
 * Unit tests for UdpClientImpl
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UdpClientImpl } from '../udp-client';
import { DriverRegistry } from '@/driver-registry';
import type { SystemMonitor } from '@/system-monitor';
import { createDriver, type Driver } from '@/types';
import type { EffectPayload } from '@/types/transformer-types';
import { createUdpSocketMock } from './udp-test-utils';

// Create mock SystemMonitor
const mockSystemMonitor = {
  trackUdpSent: vi.fn(),
} as unknown as SystemMonitor;

// Create UDP socket mock with separate driver/localhost tracking
const udpMock = createUdpSocketMock();

// Mock dgram module
vi.mock('dgram', () => ({
  default: {
    createSocket: vi.fn(() => ({
      send: udpMock.mockSocketSend,
      close: udpMock.mockSocketClose,
      on: udpMock.mockSocketOn,
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
    const driver1 = createDriver({
      id: 'rgfx-driver-0001',
      ip: '192.168.1.101',
      state: 'connected',
    });

    const driver2 = createDriver({
      id: 'rgfx-driver-0002',
      ip: '192.168.1.102',
      state: 'connected',
    });

    const driver3 = createDriver({
      id: 'rgfx-driver-0003',
      ip: '192.168.1.103',
      state: 'disconnected',
    });

    const driver4 = createDriver({
      id: 'rgfx-driver-0004',
      ip: undefined,
      state: 'connected',
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

    udpClient = new UdpClientImpl(driverRegistry, mockSystemMonitor);

    // Clear mock call history after creating udpClient
    udpMock.reset();
    (mockSystemMonitor.trackUdpSent as ReturnType<typeof vi.fn>).mockClear();
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
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should send correct JSON payload', () => {
      const payload: EffectPayload = {
        effect: 'score',
        value: 1000,
      };

      udpClient.broadcast(payload);

      // Verify the buffer contains correct JSON
      const sentBuffer = udpMock.calls.driverCalls[0].buffer;
      const sentData = JSON.parse(sentBuffer.toString()) as Record<string, unknown>;
      expect(sentData).toEqual({ effect: 'score', value: 1000 });
    });

    it('should send to correct IP and port', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // Check first call (driver-0001)
      expect(udpMock.calls.driverCalls[0].port).toBe(8888); // UDP_PORT
      expect(udpMock.calls.driverCalls[0].ip).toBe('192.168.1.101');

      // Check second call (driver-0002)
      expect(udpMock.calls.driverCalls[1].port).toBe(8888);
      expect(udpMock.calls.driverCalls[1].ip).toBe('192.168.1.102');
    });

    it('should skip disconnected drivers', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0003 is disconnected, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should skip drivers without IP addresses', () => {
      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0004 has no IP, should be skipped
      // Only driver-0001 and driver-0002 should receive
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should skip disabled drivers', () => {
      // Disable driver-0001
      const driver1 = driverRegistry.getDriver('rgfx-driver-0001');

      if (driver1) {
        driver1.disabled = true;
      }

      const payload: EffectPayload = { effect: 'test' };

      udpClient.broadcast(payload);

      // driver-0001 is disabled, should be skipped
      // Only driver-0002 should receive
      expect(udpMock.driverSendCount).toBe(1);
      expect(udpMock.calls.driverCalls[0].ip).toBe('192.168.1.102');
    });

    it('should handle empty driver list', () => {
      // Create empty registry
      const emptyRegistry = new DriverRegistry();
      const emptyClient = new UdpClientImpl(emptyRegistry, mockSystemMonitor);

      const payload: EffectPayload = { effect: 'test' };

      expect(() => {
        emptyClient.broadcast(payload);
      }).not.toThrow();

      // No driver sends should occur (clear was called before this test)
      // We need to account for sends before clearing
      udpMock.reset();
      emptyClient.broadcast(payload);
      expect(udpMock.driverSendCount).toBe(0);

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
      expect(udpMock.driverSendCount).toBe(1);
      expect(udpMock.calls.driverCalls[0].ip).toBe('192.168.1.101');
    });

    it('should send to multiple specified drivers', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0002'],
      };

      udpClient.broadcast(payload);

      // Should send to both driver-0001 and driver-0002
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should send to all drivers when drivers array is empty', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: [], // Empty array should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should send to all drivers when drivers property is undefined', () => {
      const payload: EffectPayload = {
        effect: 'test',
        // No drivers property - should send to all
      };

      udpClient.broadcast(payload);

      // Should send to all connected drivers with IPs
      expect(udpMock.driverSendCount).toBe(2);
    });

    it('should not send to any driver when no drivers match', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-9999'], // Non-existent driver
      };

      udpClient.broadcast(payload);

      // No driver sends should occur
      expect(udpMock.driverSendCount).toBe(0);
    });

    it('should remove drivers property from UDP payload', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001'], // This should be removed from UDP packet
        value: 100,
      };

      udpClient.broadcast(payload);

      // Verify the buffer doesn't contain drivers property
      const sentBuffer = udpMock.calls.driverCalls[0].buffer;
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
      expect(udpMock.driverSendCount).toBe(1);
    });

    it('should skip drivers without IP even when specified', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['rgfx-driver-0001', 'rgfx-driver-0004'], // 0004 has no IP
      };

      udpClient.broadcast(payload);

      // Should only send to driver-0001 (0004 has no IP)
      expect(udpMock.driverSendCount).toBe(1);
    });
  });

  describe('effect payload structure', () => {
    it('should handle simple effect payloads', () => {
      const payload: EffectPayload = { effect: 'generic' };

      expect(() => {
        udpClient.broadcast(payload);
      }).not.toThrow();

      const sentBuffer = udpMock.calls.driverCalls[0].buffer;
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

      const sentBuffer = udpMock.calls.driverCalls[0].buffer;
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

      const sentBuffer = udpMock.calls.driverCalls[0].buffer;
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

      expect(udpMock.mockSocketClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('socket reuse', () => {
    it('should reuse the same socket for multiple broadcasts', async () => {
      const dgram = await import('dgram');

      // Clear any previous calls
      (dgram.default.createSocket as ReturnType<typeof vi.fn>).mockClear();

      // Create a new client
      const client = new UdpClientImpl(driverRegistry, mockSystemMonitor);

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

  describe('wildcard driver targeting', () => {
    let stripMatrixRegistry: DriverRegistry;
    let stripMatrixClient: UdpClientImpl;

    beforeEach(() => {
      stripMatrixRegistry = new DriverRegistry();

      // Create strip drivers
      const strip1 = createDriver({
        id: 'strip-1',
        ip: '192.168.1.201',
        state: 'connected',
        resolvedHardware: { name: 'Strip 1', sku: null, layout: 'strip', count: 60 },
      });

      const strip2 = createDriver({
        id: 'strip-2',
        ip: '192.168.1.202',
        state: 'connected',
        resolvedHardware: { name: 'Strip 2', sku: null, layout: 'strip', count: 60 },
      });

      // Create matrix drivers
      const matrix1 = createDriver({
        id: 'matrix-1',
        ip: '192.168.1.203',
        state: 'connected',
        resolvedHardware: {
          name: 'Matrix 1',
          sku: null,
          layout: 'matrix-tl-h',
          count: 256,
          width: 16,
          height: 16,
        },
      });

      const matrix2 = createDriver({
        id: 'matrix-2',
        ip: '192.168.1.204',
        state: 'connected',
        resolvedHardware: {
          name: 'Matrix 2',
          sku: null,
          layout: 'matrix-bl-v-snake',
          count: 256,
          width: 16,
          height: 16,
        },
      });

      // Driver with no resolvedHardware (unknown type)
      const unknown1 = createDriver({
        id: 'unknown-1',
        ip: '192.168.1.205',
        state: 'connected',
      });

      // Add drivers to registry
      const drivers = stripMatrixRegistry as unknown as { drivers: Map<string, Driver> };
      drivers.drivers.set(strip1.id, strip1);
      drivers.drivers.set(strip2.id, strip2);
      drivers.drivers.set(matrix1.id, matrix1);
      drivers.drivers.set(matrix2.id, matrix2);
      drivers.drivers.set(unknown1.id, unknown1);

      stripMatrixClient = new UdpClientImpl(stripMatrixRegistry, mockSystemMonitor);
      udpMock.reset();
    });

    afterEach(() => {
      stripMatrixClient.stop();
    });

    it('should select only strip drivers with *S wildcard', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*S'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(1);
      const sentIp = udpMock.calls.driverCalls[0].ip;
      expect(['192.168.1.201', '192.168.1.202']).toContain(sentIp);
    });

    it('should select only matrix drivers with *M wildcard', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*M'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(1);
      const sentIp = udpMock.calls.driverCalls[0].ip;
      expect(['192.168.1.203', '192.168.1.204']).toContain(sentIp);
    });

    it('should select two unique strip drivers with *S, *S', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*S', '*S'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(2);
      const sentIps = udpMock.calls.driverCalls.map((c) => c.ip);
      expect(sentIps).toContain('192.168.1.201');
      expect(sentIps).toContain('192.168.1.202');
    });

    it('should select two unique matrix drivers with *M, *M', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*M', '*M'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(2);
      const sentIps = udpMock.calls.driverCalls.map((c) => c.ip);
      expect(sentIps).toContain('192.168.1.203');
      expect(sentIps).toContain('192.168.1.204');
    });

    it('should select one strip and one matrix with *S, *M', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*S', '*M'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(2);
      const sentIps = udpMock.calls.driverCalls.map((c) => c.ip);
      // One should be a strip IP, one should be a matrix IP
      const stripIps = ['192.168.1.201', '192.168.1.202'];
      const matrixIps = ['192.168.1.203', '192.168.1.204'];
      expect(sentIps.some((ip) => stripIps.includes(ip))).toBe(true);
      expect(sentIps.some((ip) => matrixIps.includes(ip))).toBe(true);
    });

    it('should resolve typed wildcards before untyped to avoid overlap', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*', '*S'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(2);
      const sentIps = udpMock.calls.driverCalls.map((c) => c.ip);
      // Should have 2 unique IPs (no duplicates)
      expect(new Set(sentIps).size).toBe(2);
      // One must be a strip
      const stripIps = ['192.168.1.201', '192.168.1.202'];
      expect(sentIps.some((ip) => stripIps.includes(ip))).toBe(true);
    });

    it('should return empty when *S requested but no strip drivers exist', () => {
      // Create registry with only matrix drivers
      const matrixOnlyRegistry = new DriverRegistry();
      const matrix = createDriver({
        id: 'matrix-only',
        ip: '192.168.1.210',
        state: 'connected',
        resolvedHardware: {
          name: 'Matrix',
          sku: null,
          layout: 'matrix-tl-h',
          count: 256,
          width: 16,
          height: 16,
        },
      });
      (matrixOnlyRegistry as unknown as { drivers: Map<string, Driver> }).drivers.set(
        matrix.id,
        matrix,
      );

      const client = new UdpClientImpl(matrixOnlyRegistry, mockSystemMonitor);
      udpMock.reset();

      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*S'],
      };

      client.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(0);
      client.stop();
    });

    it('should combine named driver with *S wildcard', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['matrix-1', '*S'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(2);
      const sentIps = udpMock.calls.driverCalls.map((c) => c.ip);
      // Should include matrix-1 and one strip
      expect(sentIps).toContain('192.168.1.203'); // matrix-1
      const stripIps = ['192.168.1.201', '192.168.1.202'];
      expect(sentIps.some((ip) => stripIps.includes(ip))).toBe(true);
    });

    it('should select any driver type with * wildcard (existing behavior)', () => {
      const payload: EffectPayload = {
        effect: 'test',
        drivers: ['*'],
      };

      stripMatrixClient.broadcast(payload);

      expect(udpMock.driverSendCount).toBe(1);
      // Could be any of the 5 drivers
      const allIps = [
        '192.168.1.201',
        '192.168.1.202',
        '192.168.1.203',
        '192.168.1.204',
        '192.168.1.205',
      ];
      const sentIp = udpMock.calls.driverCalls[0].ip;
      expect(allIps).toContain(sentIp);
    });
  });
});
