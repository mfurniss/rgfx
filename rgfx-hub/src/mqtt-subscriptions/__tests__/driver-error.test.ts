/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { subscribeDriverError } from '../driver-error';
import type { MqttBroker } from '@/network';
import { eventBus } from '@/services/event-bus';
import log from 'electron-log/main';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockLog = vi.mocked(log);

describe('subscribeDriverError', () => {
  let mockMqtt: MockProxy<MqttBroker>;
  let subscribedCallback: (topic: string, payload: string) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMqtt = mock<MqttBroker>();
    mockMqtt.subscribe.mockImplementation(
      (_topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      },
    );
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic', () => {
      subscribeDriverError({ mqtt: mockMqtt });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/system/driver/error',
        expect.any(Function),
      );
    });
  });

  describe('error event emission', () => {
    beforeEach(() => {
      subscribeDriverError({ mqtt: mockMqtt });
    });

    it('should emit system:error event with driver error details', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      const payload = {
        driverId: 'rgfx-driver-0001',
        source: 'bitmap',
        error: 'Invalid image format',
        payload: { image: ['XXX'] },
      };

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

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

      subscribedCallback('rgfx/system/driver/error', JSON.stringify(payload));

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid image format'),
      );
      expect(mockLog.warn).not.toHaveBeenCalled();
    });
  });

  describe('invalid message handling', () => {
    beforeEach(() => {
      subscribeDriverError({ mqtt: mockMqtt });
    });

    it('should not emit event for invalid JSON', () => {
      const eventBusEmitSpy = vi.spyOn(eventBus, 'emit');

      subscribedCallback('rgfx/system/driver/error', 'not valid json');

      expect(eventBusEmitSpy).not.toHaveBeenCalled();

      eventBusEmitSpy.mockRestore();
    });

    it('should not throw for invalid JSON', () => {
      expect(() => {
        subscribedCallback('rgfx/system/driver/error', '{invalid}');
      }).not.toThrow();
    });

    it('should not throw for empty message', () => {
      expect(() => {
        subscribedCallback('rgfx/system/driver/error', '');
      }).not.toThrow();
    });
  });
});
