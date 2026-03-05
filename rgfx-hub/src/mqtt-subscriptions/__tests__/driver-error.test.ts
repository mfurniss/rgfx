import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverError } from '../driver-error';
import { eventBus } from '@/services/event-bus';
import log from 'electron-log/main';
import { createMqttSubscriptionMock } from '@/__tests__/factories';

const mockLog = vi.mocked(log);

describe('subscribeDriverError', () => {
  let mqttMock: ReturnType<typeof createMqttSubscriptionMock>;

  beforeEach(() => {
    vi.clearAllMocks();

    mqttMock = createMqttSubscriptionMock();
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic', () => {
      subscribeDriverError({ mqtt: mqttMock.mockMqtt });

      expect(mqttMock.mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/system/driver/error',
        expect.any(Function),
      );
    });
  });

  describe('error event emission', () => {
    beforeEach(() => {
      subscribeDriverError({ mqtt: mqttMock.mockMqtt });
    });

    it('should emit system:error event with driver error details', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      const payload = {
        driverId: 'rgfx-driver-0001',
        source: 'bitmap',
        error: 'Invalid image format',
        payload: { image: ['XXX'] },
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(eventBusEmitSpy).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'driver',
          message: expect.stringContaining('rgfx-driver-0001'),
          driverId: 'rgfx-driver-0001',
        }),
      );

      eventBusEmitSpy.mockRestore();
    });

    it('should include source name in error message', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      const payload = {
        driverId: 'test-driver',
        source: 'pulse',
        error: 'Duration too short',
        payload: { duration: 0 },
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(eventBusEmitSpy).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          message: expect.stringContaining('pulse:'),
        }),
      );

      eventBusEmitSpy.mockRestore();
    });

    it('should include error description in message', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      const payload = {
        driverId: 'test-driver',
        source: 'wipe',
        error: 'Color value out of range',
        payload: {},
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(eventBusEmitSpy).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          message: expect.stringContaining('Color value out of range'),
        }),
      );

      eventBusEmitSpy.mockRestore();
    });

    it('should include formatted payload in details', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      const payload = {
        driverId: 'test-driver',
        source: 'test',
        error: 'Test error',
        payload: { key: 'value', nested: { data: 123 } },
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(eventBusEmitSpy).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          details: expect.stringContaining('"key": "value"'),
        }),
      );

      eventBusEmitSpy.mockRestore();
    });

    it('should include timestamp in error event', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');
      const beforeTime = Date.now();

      const payload = {
        driverId: 'test-driver',
        source: 'test',
        error: 'Test error',
        payload: {},
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      const afterTime = Date.now();
      const emittedPayload = eventBusEmitSpy.mock.calls[0][1] as { timestamp: number };

      expect(emittedPayload.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(emittedPayload.timestamp).toBeLessThanOrEqual(afterTime);

      eventBusEmitSpy.mockRestore();
    });

    it('should handle UDP queue full error from driver', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      // This is the error format sent by publishError() in esp32/src/network/udp.cpp
      // when the UDP queue is full and messages are being dropped
      const payload = {
        driverId: 'rgfx-driver-test',
        source: 'udp',
        error: 'Queue full - dropping messages',
        payload: {},
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(eventBusEmitSpy).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'driver',
          message: expect.stringContaining('Queue full - dropping messages'),
          driverId: 'rgfx-driver-test',
        }),
      );

      eventBusEmitSpy.mockRestore();
    });

    it('should log queue full errors at warn level instead of error', () => {
      const payload = {
        driverId: 'rgfx-driver-test',
        source: 'udp',
        error: 'Queue full - dropping messages',
        payload: {},
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Queue full - dropping messages'),
      );
      expect(mockLog.error).not.toHaveBeenCalled();
    });

    it('should log non-queue errors at error level', () => {
      const payload = {
        driverId: 'rgfx-driver-test',
        source: 'bitmap',
        error: 'Invalid image format',
        payload: {},
      };

      mqttMock.triggerMessage('rgfx/system/driver/error', JSON.stringify(payload));

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid image format'),
      );
      expect(mockLog.warn).not.toHaveBeenCalled();
    });
  });

  describe('invalid message handling', () => {
    beforeEach(() => {
      subscribeDriverError({ mqtt: mqttMock.mockMqtt });
    });

    it('should not emit event for invalid JSON', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      mqttMock.triggerMessage('rgfx/system/driver/error', 'not valid json');

      expect(eventBusEmitSpy).not.toHaveBeenCalled();

      eventBusEmitSpy.mockRestore();
    });

    it('should not throw for invalid JSON', () => {
      expect(() => {
        mqttMock.triggerMessage('rgfx/system/driver/error', '{invalid}');
      }).not.toThrow();
    });

    it('should not throw for empty message', () => {
      expect(() => {
        mqttMock.triggerMessage('rgfx/system/driver/error', '');
      }).not.toThrow();
    });
  });
});
