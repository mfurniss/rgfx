import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { subscribeDriverLog } from '../driver-log';
import type { DriverLogPersistence } from '@/driver-log-persistence';
import { createMqttSubscriptionMock } from '@/__tests__/factories';

describe('subscribeDriverLog', () => {
  let mqttMock: ReturnType<typeof createMqttSubscriptionMock>;
  let mockDriverLogPersistence: MockProxy<DriverLogPersistence>;

  beforeEach(() => {
    vi.clearAllMocks();

    mqttMock = createMqttSubscriptionMock();

    mockDriverLogPersistence = mock<DriverLogPersistence>();
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverLog({
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
      });

      expect(mqttMock.mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/log',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
      });
    });

    it('should extract driver ID from valid topic', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/log', payload);

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
      mqttMock.triggerMessage('rgfx/invalid/topic', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle topic missing log suffix', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'test',
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('log message validation', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
      });
    });

    it('should accept valid info log message', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test info message',
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing level field', () => {
      const payload = JSON.stringify({
        message: 'Test message',
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing message field', () => {
      const payload = JSON.stringify({
        level: 'info',
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject missing timestamp field', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test message',
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject non-string message', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 12345,
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should reject non-number timestamp', () => {
      const payload = JSON.stringify({
        level: 'info',
        message: 'Test message',
        timestamp: 'invalid',
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      subscribeDriverLog({
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
      });
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', 'not-json');
      }).not.toThrow();

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle empty payload gracefully', () => {
      expect(() => {
        mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', '');
      }).not.toThrow();

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle empty object payload', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', '{}');

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });

    it('should handle array payload', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', '[]');

      expect(mockDriverLogPersistence.appendLog).not.toHaveBeenCalled();
    });
  });

  describe('timestamp handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      subscribeDriverLog({
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
        mqtt: mqttMock.mockMqtt,
        driverLogPersistence: mockDriverLogPersistence,
      });
    });

    it('should preserve message content exactly', () => {
      const message = 'WiFi connected to SSID: TestNetwork, IP: 192.168.1.100';
      const payload = JSON.stringify({
        level: 'info',
        message,
        timestamp: 1000,
      });
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/log', payload);

      expect(mockDriverLogPersistence.appendLog).toHaveBeenCalledWith(
        'rgfx-driver-0001',
        'info',
        message,
        expect.any(Number),
      );
    });
  });
});
