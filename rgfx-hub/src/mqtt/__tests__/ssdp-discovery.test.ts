/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SsdpDiscovery } from '../ssdp-discovery';
import { Server as SSDPServer } from 'node-ssdp';

vi.mock('node-ssdp');

describe('SsdpDiscovery', () => {
  let ssdpDiscovery: SsdpDiscovery;
  let mockSSDPServer: any;

  beforeEach(() => {
    mockSSDPServer = {
      addUSN: vi.fn(),
      advertise: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    vi.mocked(SSDPServer).mockReturnValue(mockSSDPServer);

    ssdpDiscovery = new SsdpDiscovery();
  });

  afterEach(() => {
    ssdpDiscovery.stop();
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should create SSDP server with correct configuration', () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(SSDPServer).toHaveBeenCalledWith({
        location: 'http://192.168.1.100:1883',
        sourcePort: 1900,
        adInterval: 10000,
        ttl: 4,
      });
    });

    it('should add USN to SSDP server', () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockSSDPServer.addUSN).toHaveBeenCalledWith('urn:rgfx:service:mqtt:1');
    });

    it('should start SSDP server', () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      expect(mockSSDPServer.start).toHaveBeenCalled();
    });

    it('should advertise after server starts', async () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSSDPServer.advertise).toHaveBeenCalled();
    });

    it('should handle SSDP start failure gracefully', async () => {
      mockSSDPServer.start.mockRejectedValue(new Error('SSDP start failed'));

      // Should not throw
      expect(() => {
        ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      }).not.toThrow();

      // Wait for promise to reject
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe('stop', () => {
    it('should stop SSDP server', () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      ssdpDiscovery.stop();

      expect(mockSSDPServer.stop).toHaveBeenCalled();
    });

    it('should handle stop when not started', () => {
      // Should not throw
      expect(() => {
        ssdpDiscovery.stop();
      }).not.toThrow();
    });

    it('should handle multiple stop calls', () => {
      ssdpDiscovery.start({ mqttPort: 1883, localIP: '192.168.1.100' });
      ssdpDiscovery.stop();
      ssdpDiscovery.stop();

      // Should only call stop once (second call does nothing since server is undefined)
      expect(mockSSDPServer.stop).toHaveBeenCalledTimes(1);
    });
  });
});
