import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MdnsDiscovery } from '../mdns-discovery';
import { Bonjour } from 'bonjour-service';

vi.mock('bonjour-service');

describe('MdnsDiscovery', () => {
  let mdnsDiscovery: MdnsDiscovery;
  let mockBonjour: any;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      stop: vi.fn(),
    };

    mockBonjour = {
      publish: vi.fn().mockReturnValue(mockService),
      destroy: vi.fn(),
    };

    vi.mocked(Bonjour).mockReturnValue(mockBonjour);

    mdnsDiscovery = new MdnsDiscovery();
  });

  afterEach(() => {
    mdnsDiscovery.stop();
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should create Bonjour instance', () => {
      mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(Bonjour).toHaveBeenCalled();
    });

    it('should publish service with correct configuration', () => {
      mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockBonjour.publish).toHaveBeenCalledWith({
        name: 'RGFX MQTT Broker',
        type: 'rgfx-mqtt',
        protocol: 'tcp',
        port: 1883,
        txt: { ip: '192.168.1.100' },
      });
    });

    it('should use provided port in service config', () => {
      mdnsDiscovery.start({ mqttPort: 1884, localIP: '10.0.0.5' });

      expect(mockBonjour.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 1884,
          txt: { ip: '10.0.0.5' },
        }),
      );
    });

    it('should handle Bonjour creation failure gracefully', () => {
      vi.mocked(Bonjour).mockImplementation(() => {
        throw new Error('mDNS init failed');
      });

      expect(() => {
        mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      }).not.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop service and destroy Bonjour instance', () => {
      mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      mdnsDiscovery.stop();

      expect(mockService.stop).toHaveBeenCalled();
      expect(mockBonjour.destroy).toHaveBeenCalled();
    });

    it('should handle stop when not started', () => {
      expect(() => {
        mdnsDiscovery.stop();
      }).not.toThrow();
    });

    it('should handle multiple stop calls', () => {
      mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      mdnsDiscovery.stop();
      mdnsDiscovery.stop();

      expect(mockService.stop).toHaveBeenCalledTimes(1);
      expect(mockBonjour.destroy).toHaveBeenCalledTimes(1);
    });

    it('should handle service without stop method', () => {
      mockBonjour.publish.mockReturnValue({});

      mdnsDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(() => {
        mdnsDiscovery.stop();
      }).not.toThrow();
    });
  });
});
