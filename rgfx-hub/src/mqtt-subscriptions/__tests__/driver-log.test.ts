/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverLog } from '../driver-log';
import type { MqttBroker } from '../../mqtt';
import type { DriverLogPersistence } from '../../driver-log-persistence';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('subscribeDriverLog', () => {
  let mockMqtt: {
    subscribe: ReturnType<typeof vi.fn>;
  };
  let mockDriverLogPersistence: {
    appendLog: ReturnType<typeof vi.fn>;
  };
  let subscribedCallback: (topic: string, payload: string) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMqtt = {
      subscribe: vi.fn(
        (topic: string, callback: (topic: string, payload: string) => void) => {
          subscribedCallback = callback;
        },
      ),
    };

    mockDriverLogPersistence = {
      appendLog: vi.fn(),
    };
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/log',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });
    });

    it('should extract driver ID from valid topic', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should extract driver ID with MAC address format', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/AA:BB:CC:DD:EE:FF/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should handle invalid topic format gracefully', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/invalid/topic', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle topic missing log suffix', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('log message validation', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });
    });

    it('should accept valid info log message', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test info message',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        'Test info message',
        expect.any(Number),
      );
    });

    it('should accept valid error log message', () => {
      const payload = JSON.stringify({
        level: 'error',
        message: 'Test error message',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'error',
        'Test error message',
        expect.any(Number),
      );
    });

    it('should reject invalid log level', () => {
      const payload = JSON.stringify({
        level: 'debug',
        message: 'Test message',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing level field', () => {
      const payload = JSON.stringify({
        message: 'Test message',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing message field', () => {
      const payload = JSON.stringify({
        level: 'info',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing timestamp field', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test message',
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject non-string message', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 12345,
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject non-number timestamp', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test message',
        timestamp: 'invalid',
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        subscribedCallback('rgfx/driver/rgfx-driver-0001/log', 'not-json');
      }).not.toThrow();

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle empty payload gracefully', () => {
      expect(() => {
        subscribedCallback('rgfx/driver/rgfx-driver-0001/log', '');
      }).not.toThrow();

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle empty object payload', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', '{}');

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle array payload', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', '[]');

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('timestamp handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use Hub timestamp instead of driver uptime', () => {
      const driverUptime = 60000;
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test message',
        timestamp: driverUptime,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        'Test message',
        Date.now(),
      );
    });
  });

  describe('message content', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverLogPersistence:
          mockDriverLogPersistence as unknown as DriverLogPersistence,
      });
    });

    it('should preserve message content exactly', () => {
      const message = 'WiFi connected to SSID: TestNetwork, IP: 192.168.1.100';
      const payload = JSON.stringify({
        level: 'info',
        message,
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        message,
        expect.any(Number),
      );
    });

    it('should handle messages with special characters', () => {
      const message = 'Error: "null pointer" at 0x0000';
      const payload = JSON.stringify({
        level: 'error',
        message,
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'error',
        message,
        expect.any(Number),
      );
    });

    it('should handle empty string message', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: '',
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        '',
        expect.any(Number),
      );
    });

    it('should handle very long messages', () => {
      const message = 'A'.repeat(10000);
      const payload = JSON.stringify({
        level: 'info',
        message,
        timestamp: 1000,
      });
      subscribedCallback('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        message,
        expect.any(Number),
      );
    });
  });
});
