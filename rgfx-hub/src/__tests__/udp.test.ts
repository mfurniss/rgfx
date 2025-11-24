/**
 * Integration tests for Udp
 *
 * Uses real UDP sockets on localhost to verify actual packet transmission
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Udp } from '../udp';
import dgram from 'node:dgram';

describe('Udp', () => {
  let udp: Udp;
  let receiver: dgram.Socket;
  let receivedMessages: { payload: any; buffer: Buffer }[];
  const TEST_PORT = 9999; // Use non-standard port for testing
  const TEST_IP = '127.0.0.1';

  beforeEach(async () => {
    receivedMessages = [];

    // Create real UDP receiver socket
    receiver = dgram.createSocket('udp4');

    // Bind receiver to test port
    await new Promise<void>((resolve) => {
      receiver.bind(TEST_PORT, TEST_IP, () => {
        resolve();
      });
    });

    // Capture received messages
    receiver.on('message', (buffer) => {
      try {
        const payload = JSON.parse(buffer.toString());
        receivedMessages.push({ payload, buffer });
      } catch {
        // Ignore non-JSON messages
      }
    });

    // Create Udp instance pointing to our receiver
    udp = new Udp(TEST_IP, TEST_PORT);
  });

  afterEach(() => {
    udp.stop();
    receiver.close();
  });

  describe('send', () => {
    it('should send UDP message with correct JSON format', async () => {
      udp.send({ effect: 'pulse', color: '0xFF0000' });

      // Wait for UDP packet to arrive
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toEqual({
        effect: 'pulse',
        color: '0xFF0000',
      });
    });

    it('should call success callback on successful send', async () => {
      const successCallback = vi.fn();
      udp.setSentCallback(successCallback);

      udp.send({ effect: 'pulse', color: '0x0000FF' });

      // Wait for send callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(successCallback).toHaveBeenCalled();
    });

    it('should send multiple messages sequentially', async () => {
      udp.send({ effect: 'pulse', color: '0xFF0000' });
      udp.send({ effect: 'fade', color: '0x00FF00' });
      udp.send({ effect: 'solid', color: '0x0000FF' });

      // Wait for all packets
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages).toHaveLength(3);
      expect(receivedMessages[0].payload.effect).toBe('pulse');
      expect(receivedMessages[1].payload.effect).toBe('fade');
      expect(receivedMessages[2].payload.effect).toBe('solid');
    });

    it('should handle complex payload objects', async () => {
      const payload = {
        effect: 'score',
        value: 12450,
        player: 'p1',
        multiplier: 2,
        combo: true,
      };

      udp.send(payload);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toEqual(payload);
    });
  });

  describe('setErrorCallback', () => {
    it('should call error callback on send to invalid address', async () => {
      const errorCallback = vi.fn();

      // Create UDP instance with invalid IP (broadcast address without SO_BROADCAST)
      const invalidUdp = new Udp('255.255.255.255', TEST_PORT);
      invalidUdp.setErrorCallback(errorCallback);

      invalidUdp.send({ effect: 'test' });

      // Wait for error
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorCallback).toHaveBeenCalled();
      expect(errorCallback.mock.calls[0][0]).toBeInstanceOf(Error);

      invalidUdp.stop();
    });
  });

  describe('setSentCallback', () => {
    it('should allow callback to be changed', async () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      udp.setSentCallback(firstCallback);
      udp.send({ effect: 'pulse', color: '0xFF0000' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(0);

      udp.setSentCallback(secondCallback);
      udp.send({ effect: 'pulse', color: '0x00FF00' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('effect and payload variations', () => {
    it('should handle different effect types', async () => {
      const effects = ['pulse', 'fade', 'solid', 'rainbow', 'chase'];

      for (const effect of effects) {
        udp.send({ effect, color: '0xFFFFFF' });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages).toHaveLength(effects.length);
      effects.forEach((effect, index) => {
        expect(receivedMessages[index].payload.effect).toBe(effect);
      });
    });

    it('should handle payloads with additional properties', async () => {
      udp.send({
        effect: 'wipe',
        color: '#FF0000',
        direction: 'left',
        speed: 200,
        duration: 1000,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload).toEqual({
        effect: 'wipe',
        color: '#FF0000',
        direction: 'left',
        speed: 200,
        duration: 1000,
      });
    });
  });
});
