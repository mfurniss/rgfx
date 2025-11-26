/**
 * Integration tests for MqttClientWrapper
 *
 * Uses real Aedes instance to verify actual MQTT publishing behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Aedes from 'aedes';
import { MqttClientWrapper } from '../mqtt-client-wrapper';
import type { MqttBroker } from '../../mqtt';

describe('MqttClientWrapper', () => {
  let aedes: Aedes;
  let mqtt: MqttBroker;
  let mqttClient: MqttClientWrapper;
  let receivedMessages: { topic: string; payload: string }[];

  beforeEach(() => {
    // Create real Aedes instance
    aedes = new Aedes();
    receivedMessages = [];

    // Subscribe to all topics to capture published messages
    aedes.on('publish', (packet, _client) => {
      // Filter out $SYS topics (internal Aedes messages)
      if (!packet.topic.startsWith('$SYS')) {
        receivedMessages.push({
          topic: packet.topic,
          payload: packet.payload.toString(),
        });
      }
    });

    // Create minimal MqttBroker wrapper
    mqtt = {
      aedes,
    } as MqttBroker;

    mqttClient = new MqttClientWrapper(mqtt);
  });

  afterEach(() => {
    // Cleanup Aedes
    aedes.close();
  });

  describe('publish', () => {
    it('should publish string payload', async () => {
      await mqttClient.publish('test/topic', 'hello world');

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].topic).toBe('test/topic');
      expect(receivedMessages[0].payload).toBe('hello world');
    });

    it('should publish object payload as JSON', async () => {
      const payload = { game: 'pacman', score: 12450 };

      await mqttClient.publish('game/score', payload);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].topic).toBe('game/score');
      expect(JSON.parse(receivedMessages[0].payload)).toEqual(payload);
    });

    it('should publish number payload', async () => {
      await mqttClient.publish('test/number', 42);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toBe('42');
    });

    it('should publish boolean payload', async () => {
      await mqttClient.publish('test/bool', true);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toBe('true');
    });

    it('should publish array payload', async () => {
      await mqttClient.publish('test/array', [1, 2, 3]);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toBe('[1,2,3]');
    });

    it('should publish null payload', async () => {
      await mqttClient.publish('test/null', null);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toBe('null');
    });

    it('should publish complex nested objects', async () => {
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

      expect(receivedMessages).toHaveLength(1);
      expect(JSON.parse(receivedMessages[0].payload)).toEqual(complex);
    });
  });

  describe('topic patterns', () => {
    it('should handle simple topics', async () => {
      await mqttClient.publish('simple', 'message');

      expect(receivedMessages[0].topic).toBe('simple');
    });

    it('should handle hierarchical topics', async () => {
      await mqttClient.publish('home/living-room/lights', 'on');

      expect(receivedMessages[0].topic).toBe('home/living-room/lights');
    });

    it('should handle topics with special characters', async () => {
      await mqttClient.publish('device/sensor-1/temperature', '22.5');

      expect(receivedMessages[0].topic).toBe('device/sensor-1/temperature');
    });
  });

  describe('async behavior', () => {
    it('should return promise that resolves', async () => {
      const promise = mqttClient.publish('test/topic', 'message');

      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle multiple concurrent publishes', async () => {
      const promises = [
        mqttClient.publish('topic1', 'msg1'),
        mqttClient.publish('topic2', 'msg2'),
        mqttClient.publish('topic3', 'msg3'),
      ];

      await Promise.all(promises);

      expect(receivedMessages).toHaveLength(3);
      expect(receivedMessages.map((m) => m.topic)).toEqual(['topic1', 'topic2', 'topic3']);
      expect(receivedMessages.map((m) => m.payload)).toEqual(['msg1', 'msg2', 'msg3']);
    });
  });

  describe('error handling', () => {
    it('should reject on JSON serialization error', async () => {
      // Create circular reference that can't be serialized
      const circular: any = { a: 1 };
      circular.self = circular;

      await expect(mqttClient.publish('test/topic', circular)).rejects.toThrow();
    });
  });
});
