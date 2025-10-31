/**
 * Unit tests for MqttClientWrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MqttClientWrapper } from '../mqtt-client-wrapper';
import type { Mqtt } from '../../mqtt';

describe('MqttClientWrapper', () => {
  let mockMqtt: Mqtt;
  let mockAedes: any;
  let mqttClient: MqttClientWrapper;

  beforeEach(() => {
    // Mock Aedes publish method
    mockAedes = {
      publish: vi.fn((packet, callback) => {
        // Simulate successful publish
        callback(null);
      }),
    };

    // Mock Mqtt instance
    mockMqtt = {
      aedes: mockAedes,
    } as unknown as Mqtt;

    mqttClient = new MqttClientWrapper(mockMqtt);
  });

  describe('publish', () => {
    it('should publish string payload', async () => {
      await mqttClient.publish('test/topic', 'hello world');

      expect(mockAedes.publish).toHaveBeenCalledOnce();
      const call = mockAedes.publish.mock.calls[0][0];

      expect(call.topic).toBe('test/topic');
      expect(call.payload.toString()).toBe('hello world');
      expect(call.qos).toBe(2); // Default QoS
    });

    it('should publish object payload as JSON', async () => {
      const payload = { game: 'pacman', score: 12450 };

      await mqttClient.publish('game/score', payload);

      expect(mockAedes.publish).toHaveBeenCalledOnce();
      const call = mockAedes.publish.mock.calls[0][0];

      expect(call.topic).toBe('game/score');
      expect(call.payload.toString()).toBe(JSON.stringify(payload));
      expect(call.qos).toBe(2);
    });

    it('should publish with QoS 0', async () => {
      await mqttClient.publish('test/topic', 'message', 0);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.qos).toBe(0);
    });

    it('should publish with QoS 1', async () => {
      await mqttClient.publish('test/topic', 'message', 1);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.qos).toBe(1);
    });

    it('should publish with QoS 2 (default)', async () => {
      await mqttClient.publish('test/topic', 'message');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.qos).toBe(2);
    });

    it('should use QoS 2 when explicitly specified', async () => {
      await mqttClient.publish('test/topic', 'message', 2);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.qos).toBe(2);
    });

    it('should set retain to false', async () => {
      await mqttClient.publish('test/topic', 'message');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.retain).toBe(false);
    });

    it('should set dup to false', async () => {
      await mqttClient.publish('test/topic', 'message');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.dup).toBe(false);
    });

    it('should set cmd to publish', async () => {
      await mqttClient.publish('test/topic', 'message');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.cmd).toBe('publish');
    });
  });

  describe('error handling', () => {
    it('should reject on publish error', async () => {
      const error = new Error('Network error');
      mockAedes.publish = vi.fn((packet, callback) => {
        callback(error);
      });

      await expect(
        mqttClient.publish('test/topic', 'message'),
      ).rejects.toThrow('Network error');
    });

    it('should reject on JSON serialization error', async () => {
      // Create circular reference that can't be serialized
      const circular: any = { a: 1 };
      circular.self = circular;

      await expect(
        mqttClient.publish('test/topic', circular),
      ).rejects.toThrow();
    });

    it('should handle null callback error', async () => {
      mockAedes.publish = vi.fn((packet, callback) => {
        callback(null);
      });

      await expect(
        mqttClient.publish('test/topic', 'message'),
      ).resolves.toBeUndefined();
    });
  });

  describe('payload types', () => {
    it('should handle number payload', async () => {
      await mqttClient.publish('test/number', 42);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.payload.toString()).toBe('42');
    });

    it('should handle boolean payload', async () => {
      await mqttClient.publish('test/bool', true);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.payload.toString()).toBe('true');
    });

    it('should handle array payload', async () => {
      await mqttClient.publish('test/array', [1, 2, 3]);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.payload.toString()).toBe('[1,2,3]');
    });

    it('should handle null payload', async () => {
      await mqttClient.publish('test/null', null);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.payload.toString()).toBe('null');
    });

    it('should handle undefined payload', async () => {
      await mqttClient.publish('test/undefined', undefined);

      const call = mockAedes.publish.mock.calls[0][0];
      // undefined becomes empty string in JSON.stringify
      expect(call.payload.toString()).toBe('');
    });

    it('should handle complex nested objects', async () => {
      const complex = {
        player: {
          score: 12450,
          lives: 3,
          powerups: ['star', 'mushroom'],
        },
        enemies: [
          { id: 'goomba1', state: 1 },
          { id: 'koopa1', state: 2 },
        ],
      };

      await mqttClient.publish('game/state', complex);

      const call = mockAedes.publish.mock.calls[0][0];
      expect(JSON.parse(call.payload.toString())).toEqual(complex);
    });
  });

  describe('topic patterns', () => {
    it('should handle simple topics', async () => {
      await mqttClient.publish('simple', 'message');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.topic).toBe('simple');
    });

    it('should handle hierarchical topics', async () => {
      await mqttClient.publish('home/living-room/lights', 'on');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.topic).toBe('home/living-room/lights');
    });

    it('should handle topics with special characters', async () => {
      await mqttClient.publish('device/sensor-1/temperature', '22.5');

      const call = mockAedes.publish.mock.calls[0][0];
      expect(call.topic).toBe('device/sensor-1/temperature');
    });
  });

  describe('async behavior', () => {
    it('should return promise that resolves', async () => {
      const promise = mqttClient.publish('test/topic', 'message');

      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should allow await', async () => {
      await mqttClient.publish('test/topic', 'message');

      expect(mockAedes.publish).toHaveBeenCalledOnce();
    });

    it('should handle multiple concurrent publishes', async () => {
      const promises = [
        mqttClient.publish('topic1', 'msg1'),
        mqttClient.publish('topic2', 'msg2'),
        mqttClient.publish('topic3', 'msg3'),
      ];

      await Promise.all(promises);

      expect(mockAedes.publish).toHaveBeenCalledTimes(3);
    });
  });
});
