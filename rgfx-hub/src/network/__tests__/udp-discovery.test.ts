import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UdpDiscovery } from '../udp-discovery';
import { createSocket } from 'node:dgram';

vi.mock('node:dgram');
vi.mock('../network-utils', () => ({
  getBroadcastAddress: vi.fn().mockReturnValue('192.168.1.255'),
}));

describe('UdpDiscovery', () => {
  let udpDiscovery: UdpDiscovery;
  let mockSocket: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockSocket = {
      on: vi.fn(),
      bind: vi.fn((callback) => {
        if (callback) {
          callback();
        }
      }),
      setBroadcast: vi.fn(),
      send: vi.fn((_msg, _port, _addr, callback) => {
        if (callback) {
          callback(null);
        }
      }),
      close: vi.fn(),
    };

    vi.mocked(createSocket).mockReturnValue(mockSocket);

    udpDiscovery = new UdpDiscovery();
  });

  afterEach(() => {
    udpDiscovery.stop();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should create UDP socket', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(createSocket).toHaveBeenCalledWith('udp4');
    });

    it('should register error handler', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should enable broadcast mode', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockSocket.setBroadcast).toHaveBeenCalledWith(true);
    });

    it('should send initial broadcast immediately', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          service: 'rgfx-mqtt-broker',
          ip: '192.168.1.100',
          port: 1883,
        }),
        8889,
        '192.168.1.255',
        expect.any(Function),
      );
    });

    it('should send periodic broadcasts', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      // Initial broadcast
      expect(mockSocket.send).toHaveBeenCalledTimes(1);

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      expect(mockSocket.send).toHaveBeenCalledTimes(2);

      // Advance time by another 5 seconds
      vi.advanceTimersByTime(5000);
      expect(mockSocket.send).toHaveBeenCalledTimes(3);
    });

    it('should handle socket error gracefully', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'error',
      )?.[1];

      // Should not throw
      expect(() => {
        if (errorHandler) {
          errorHandler(new Error('Socket error'));
        }
      }).not.toThrow();
    });

    it('should handle send error gracefully', () => {
      mockSocket.send.mockImplementation((_msg: any, _port: any, _addr: any, callback: any) => {
        if (callback) {
          callback(new Error('Send failed'));
        }
      });

      // Should not throw
      expect(() => {
        udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      }).not.toThrow();
    });
  });

  describe('stop', () => {
    it('should clear broadcast interval', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      udpDiscovery.stop();

      // Advance time - should not trigger more broadcasts
      const sendCountBefore = mockSocket.send.mock.calls.length;
      vi.advanceTimersByTime(10000);
      expect(mockSocket.send).toHaveBeenCalledTimes(sendCountBefore);
    });

    it('should close socket', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      udpDiscovery.stop();

      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should handle stop when not started', () => {
      // Should not throw
      expect(() => {
        udpDiscovery.stop();
      }).not.toThrow();
    });

    it('should handle multiple stop calls', () => {
      udpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      udpDiscovery.stop();
      udpDiscovery.stop();

      // Should only close once
      expect(mockSocket.close).toHaveBeenCalledTimes(1);
    });
  });
});
