import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDriverConnectService } from '../driver-connect-service';
import type { DriverConfig, ConfiguredDriver } from '../../driver-config';
import type { MqttBroker } from '../../network';
import type { Driver } from '../../types';

describe('createDriverConnectService', () => {
  let mockDriverConfig: {
    getDriver: ReturnType<typeof vi.fn>;
  };
  let mockMqtt: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  let mockDriver: Driver;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriver = {
      id: 'rgfx-driver-0001',
      mac: 'AA:BB:CC:DD:EE:FF',
      ip: '192.168.1.100',
      state: 'connected',
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      disabled: false,
      stats: {
        telemetryEventsReceived: 0,
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
      },
    };

    mockDriverConfig = {
      getDriver: vi.fn(() => null),
    };

    mockMqtt = {
      publish: vi.fn(() => Promise.resolve()),
    };

    mockUploadConfigToDriver = vi.fn(() => Promise.resolve(true));
  });

  function createService() {
    return createDriverConnectService({
      driverConfig: mockDriverConfig as unknown as DriverConfig,
      mqtt: mockMqtt as unknown as MqttBroker,
      uploadConfigToDriver: mockUploadConfigToDriver,
    });
  }

  describe('config upload', () => {
    it('should upload config to driver with MAC address', () => {
      const service = createService();
      service.onDriverConnected(mockDriver);

      expect(mockUploadConfigToDriver)
        .toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should not upload config if driver has no MAC', () => {
      mockDriver.mac = undefined;
      const service = createService();
      service.onDriverConnected(mockDriver);

      expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
    });

    it('should handle config upload errors gracefully', () => {
      mockUploadConfigToDriver.mockRejectedValue(
        new Error('Upload failed'),
      );
      const service = createService();

      expect(() => {
        service.onDriverConnected(mockDriver);
      }).not.toThrow();
    });
  });

  describe('remote logging configuration', () => {
    it('should publish logging config to driver', async () => {
      const service = createService();
      service.onDriverConnected(mockDriver);

      await vi.waitFor(() => {
        expect(mockMqtt.publish).toHaveBeenCalledWith(
          'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
          JSON.stringify({ level: 'off' }),
        );
      });
    });

    it('should use persisted logging level if available', async () => {
      const configuredDriver: ConfiguredDriver = {
        id: 'rgfx-driver-0001',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        remoteLogging: 'all',
        disabled: false,
      };
      mockDriverConfig.getDriver.mockReturnValue(configuredDriver);

      const service = createService();
      service.onDriverConnected(mockDriver);

      await vi.waitFor(() => {
        expect(mockMqtt.publish).toHaveBeenCalledWith(
          'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
          JSON.stringify({ level: 'all' }),
        );
      });
    });

    it('should default to "off" if no persisted driver exists', async () => {
      mockDriverConfig.getDriver.mockReturnValue(null);

      const service = createService();
      service.onDriverConnected(mockDriver);

      await vi.waitFor(() => {
        expect(mockMqtt.publish).toHaveBeenCalledWith(
          'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
          JSON.stringify({ level: 'off' }),
        );
      });
    });

    it('should not publish logging config if driver has no MAC', () => {
      mockDriver.mac = undefined;
      const service = createService();
      service.onDriverConnected(mockDriver);

      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should handle MQTT publish errors gracefully', () => {
      mockMqtt.publish.mockRejectedValue(new Error('MQTT error'));
      const service = createService();

      expect(() => {
        service.onDriverConnected(mockDriver);
      }).not.toThrow();
    });
  });
});
