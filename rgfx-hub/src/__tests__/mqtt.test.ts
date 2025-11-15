import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Mqtt } from '../mqtt';
import Aedes from 'aedes';
import { createServer } from 'node:net';
import { Server as SSDPServer } from 'node-ssdp';

// Mock dependencies
vi.mock('aedes');
vi.mock('node:net');
vi.mock('node-ssdp');

describe('Mqtt', () => {
  let mqtt: Mqtt;
  let mockAedes: any;
  let mockServer: any;
  let mockSSDPServer: any;

  beforeEach(() => {
    // Mock Aedes instance
    mockAedes = {
      handle: vi.fn(),
      on: vi.fn(),
      publish: vi.fn((_packet, callback) => {
        if (callback) callback(null);
      }),
      close: vi.fn((callback) => {
        if (callback) callback();
      }),
    };

    // Mock server instance
    mockServer = {
      on: vi.fn(),
      listen: vi.fn((_port, callback) => {
        if (callback) callback();
      }),
      close: vi.fn((callback) => {
        if (callback) callback();
      }),
    };

    // Mock SSDP server
    mockSSDPServer = {
      addUSN: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    // Setup mocks
    vi.mocked(Aedes).mockReturnValue(mockAedes);
    vi.mocked(createServer).mockReturnValue(mockServer);
    vi.mocked(SSDPServer).mockReturnValue(mockSSDPServer);

    mqtt = new Mqtt(1883);
  });

  afterEach(async () => {
    await mqtt.stop();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create MQTT broker with default port', () => {
      const mqttDefault = new Mqtt();
      expect(mqttDefault).toBeDefined();
    });

    it('should create MQTT broker with custom port', () => {
      const mqttCustom = new Mqtt(1884);
      expect(mqttCustom).toBeDefined();
    });

    it('should create Aedes instance', () => {
      expect(Aedes).toHaveBeenCalled();
    });

    it('should create server with Aedes handler', () => {
      expect(createServer).toHaveBeenCalledWith(mockAedes.handle);
    });

    it('should setup event handlers', () => {
      expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAedes.on).toHaveBeenCalledWith('client', expect.any(Function));
      expect(mockAedes.on).toHaveBeenCalledWith('clientDisconnect', expect.any(Function));
      expect(mockAedes.on).toHaveBeenCalledWith('publish', expect.any(Function));
    });
  });

  describe('subscribe', () => {
    it('should register subscription callback for exact match', () => {
      const callback = vi.fn();
      mqtt.subscribe('test/topic', callback);

      // Simulate a publish event
      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      const mockClient = { id: 'test-client' };
      const mockPacket = {
        topic: 'test/topic',
        payload: Buffer.from('test-payload'),
      };

      if (publishHandler) {
        publishHandler(mockPacket, mockClient);
      }

      expect(callback).toHaveBeenCalledWith('test/topic', 'test-payload');
    });

    it('should match single-level wildcard (+)', () => {
      const callback = vi.fn();
      mqtt.subscribe('rgfx/driver/+/test/state', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      const mockClient = { id: 'test-client' };

      // Should match with any value in the + position
      if (publishHandler) {
        publishHandler(
          {
            topic: 'rgfx/driver/AA-BB-CC-DD-EE-FF/test/state',
            payload: Buffer.from('on'),
          },
          mockClient
        );
      }

      expect(callback).toHaveBeenCalledWith('rgfx/driver/AA-BB-CC-DD-EE-FF/test/state', 'on');
    });

    it('should match multiple single-level wildcards', () => {
      const callback = vi.fn();
      mqtt.subscribe('rgfx/+/+/test', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      if (publishHandler) {
        publishHandler(
          {
            topic: 'rgfx/driver/device-id/test',
            payload: Buffer.from('data'),
          },
          { id: 'client' }
        );
      }

      expect(callback).toHaveBeenCalledWith('rgfx/driver/device-id/test', 'data');
    });

    it('should match multi-level wildcard (#)', () => {
      const callback = vi.fn();
      mqtt.subscribe('rgfx/driver/#', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      if (publishHandler) {
        publishHandler(
          {
            topic: 'rgfx/driver/device-id/test/state',
            payload: Buffer.from('on'),
          },
          { id: 'client' }
        );

        publishHandler(
          {
            topic: 'rgfx/driver/config',
            payload: Buffer.from('{}'),
          },
          { id: 'client' }
        );
      }

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not match if segment count differs (without #)', () => {
      const callback = vi.fn();
      mqtt.subscribe('rgfx/driver/+/test', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      if (publishHandler) {
        // Too many segments
        publishHandler(
          {
            topic: 'rgfx/driver/device-id/test/extra',
            payload: Buffer.from('data'),
          },
          { id: 'client' }
        );

        // Too few segments
        publishHandler(
          {
            topic: 'rgfx/driver/test',
            payload: Buffer.from('data'),
          },
          { id: 'client' }
        );
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not match if non-wildcard segments differ', () => {
      const callback = vi.fn();
      mqtt.subscribe('rgfx/driver/+/test', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      if (publishHandler) {
        publishHandler(
          {
            topic: 'rgfx/sensor/device-id/test',
            payload: Buffer.from('data'),
          },
          { id: 'client' }
        );
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      mqtt.subscribe('topic/one', callback1);
      mqtt.subscribe('topic/two', callback2);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      const mockClient = { id: 'test-client' };

      // Publish to topic one
      if (publishHandler) {
        publishHandler(
          {
            topic: 'topic/one',
            payload: Buffer.from('payload1'),
          },
          mockClient
        );
      }

      expect(callback1).toHaveBeenCalledWith('topic/one', 'payload1');
      expect(callback2).not.toHaveBeenCalled();

      // Publish to topic two
      if (publishHandler) {
        publishHandler(
          {
            topic: 'topic/two',
            payload: Buffer.from('payload2'),
          },
          mockClient
        );
      }

      expect(callback2).toHaveBeenCalledWith('topic/two', 'payload2');
    });

    it('should not call callback for unsubscribed topics', () => {
      const callback = vi.fn();
      mqtt.subscribe('subscribed/topic', callback);

      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      if (publishHandler) {
        publishHandler(
          {
            topic: 'unsubscribed/topic',
            payload: Buffer.from('test'),
          },
          { id: 'client' }
        );
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should publish message to topic with QoS 2', () => {
      mqtt.publish('test/topic', 'test payload');

      expect(mockAedes.publish).toHaveBeenCalledWith(
        {
          cmd: 'publish',
          qos: 2,
          dup: false,
          topic: 'test/topic',
          payload: Buffer.from('test payload'),
          retain: false,
        },
        expect.any(Function)
      );
    });

    it('should handle publish errors', async () => {
      const testError = new Error('Publish failed');
      mockAedes.publish.mockImplementation((_packet: any, callback: any) => {
        if (callback) callback(testError);
      });

      // Should reject with the error
      await expect(mqtt.publish('test/topic', 'payload')).rejects.toThrow('Publish failed');
    });

    it('should publish multiple messages', () => {
      mqtt.publish('topic1', 'payload1');
      mqtt.publish('topic2', 'payload2');
      mqtt.publish('topic3', 'payload3');

      expect(mockAedes.publish).toHaveBeenCalledTimes(3);
    });
  });

  describe('start', () => {
    it('should start server on specified port', () => {
      mqtt.start();

      expect(mockServer.listen).toHaveBeenCalledWith(1883, expect.any(Function));
    });

    it('should announce via SSDP', () => {
      mqtt.start();

      expect(SSDPServer).toHaveBeenCalledWith({
        location: expect.stringMatching(/^http:\/\/\d+\.\d+\.\d+\.\d+:1883$/),
        sourcePort: 1900,
      });
      expect(mockSSDPServer.addUSN).toHaveBeenCalledWith('urn:rgfx:service:mqtt:1');
      expect(mockSSDPServer.start).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop SSDP server', async () => {
      mqtt.start();
      await mqtt.stop();

      expect(mockSSDPServer.stop).toHaveBeenCalled();
    });

    it('should close Aedes and server', async () => {
      await mqtt.stop();

      expect(mockAedes.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should resolve promise when fully stopped', async () => {
      const stopPromise = mqtt.stop();
      await expect(stopPromise).resolves.toBeUndefined();
    });
  });

  describe('client events', () => {
    it('should handle client connection', () => {
      const clientHandler = mockAedes.on.mock.calls.find((call: any) => call[0] === 'client')?.[1];

      const mockClient = { id: 'new-client' };

      // Should not throw
      expect(() => {
        if (clientHandler) clientHandler(mockClient);
      }).not.toThrow();
    });

    it('should handle client disconnection', () => {
      const disconnectHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'clientDisconnect'
      )?.[1];

      const mockClient = { id: 'disconnecting-client' };

      // Should not throw
      expect(() => {
        if (disconnectHandler) disconnectHandler(mockClient);
      }).not.toThrow();
    });

    it('should handle publish without client', () => {
      const publishHandler = mockAedes.on.mock.calls.find(
        (call: any) => call[0] === 'publish'
      )?.[1];

      const mockPacket = {
        topic: 'test/topic',
        payload: Buffer.from('test'),
      };

      // Should not throw when client is null
      expect(() => {
        if (publishHandler) publishHandler(mockPacket, null);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle server errors', () => {
      const errorHandler = mockServer.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];

      const testError = new Error('Server error');

      // Should not throw
      expect(() => {
        if (errorHandler) errorHandler(testError);
      }).not.toThrow();
    });
  });
});
